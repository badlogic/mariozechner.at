<%
	meta("../../meta.json")
	meta()
	const path = require('path');
	url = url + "/posts/" + path.basename(path.dirname(outputPath)) + "/";
%>
<%= render("../../_partials/post-header.html", { title, image, url }) %>

**Table of contents**
%%toc%%

I love [Live++](https://liveplusplus.tech/) by Molecular Matters, aka [Stefan Reinalter](https://x.com/molecularmusing). It's an exceptionally fantastic C/C++ hot-reload/live coding solution for Windows, Xbox, and PlayStation 5. If you do any kind of C/C++ development on these platforms, you absolutely owe it to yourself to get a license.

I've been using it to work on a Godot module (on Windows), and it's reduced my iteration times to essentially zero for most programming tasks. If I compare the billable hours I saved with Live++ to its price, I can only conclude that Stefan hates capitalism.

Sadly, I'm a macOS boi (don't @ me), and Live++ doesn't work on macOS.

I'm on vacation and figured I'll have a look-see into what it takes to inject some code into a running process. Not that this could do anything like Live++ can do. But it's a fun, small project with a scope fitting for a lush evening sitting on a porch next to the Adriatic Sea.

Given this little C test program:

```c
#include <cstdio>
#include <unistd.h>

int data = 123;

int foo() {
    return data;
}

int main(int argc, char** argv) {
    while (true) {
        printf("%d\n", foo());
        sleep(1);
    }
}
```

We want to write a program that:
* Attaches to a running instance of this test program (like a debugger)
* Changes the value of `data` to something else, so `foo()` returns something other than `123`, and hence `printf()` also prints a different value to `stdout`. Essentially reading/writing to the test program process memory.
* Entirely replaces `foo()` with a new function that isn't part of the original program, but instead is written to the process memory on-the-fly while it's running.

We'll limit this to macOS, which means we'll be using the [Mach APIs](https://developer.apple.com/documentation/kernel/mach) like `task_for_pid()` and consorts.

None of this is rocket science. But since I couldn't find a straightforward article on this on the internet, I figured I'll write one. You can check out the full source code on [GitHub](https://github.com/badlogic/macinject). Below, we'll run through the different parts.

## CMake setup & entitlements
Let's start with a CMake scaffold.

```cmake
cmake_minimum_required(VERSION 3.10)

project(macinject)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)
set(CMAKE_OSX_DEPLOYMENT_TARGET "10.14")

# Test program
file(GLOB_RECURSE TEST_SOURCES "test/*.cpp")
add_executable(test ${TEST_SOURCES})
set_target_properties(test PROPERTIES COMPILE_FLAGS "-O0 -g -fpatchable-function-entry=4,0")

# Injection program
file(GLOB_RECURSE SOURCES "src/*.cpp")
add_executable(macinject ${SOURCES})

add_custom_command(TARGET macinject POST_BUILD
    COMMAND codesign --entitlements "${CMAKE_SOURCE_DIR}/entitlements.plist" -s "Apple Development" $<TARGET_FILE:macinject>
)
```

The test program consists of any `.cpp` file in the `test/` folder. The compiler flags `-O0 -g` ensure we produce a debug binary without optimizations. The final compiler flag we'll discuss later.

The injection program consists of any `.cpp` file in the `src/` folder. To modify another process via Mach APIs, our injection program needs [entitlements](https://developer.apple.com/documentation/bundleresources/entitlements) so macOS actually allows it to be a bit nasty. Entitlements are embedded in an executable via code signing. The custom command calls into Xcode's `codesign` tool, telling it to embed the entitlements in the file `entitlements.plist`, which looks like this:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.debugger</key>
    <true/>
</dict>
</plist>
```

This single entitlement will grant our injection program basically the same abilities as any other debugger.

Assuming you have installed Xcode and CMake (`brew install cmake`) on your Mac, you can build the programs like this:

```bash
git clone https://github.com/badlogic/macinject
cd macinject
mkdir build && cd build
cmake ..
# Repeat this any time you change the sources
make
```

Or you can use the [VS Code C++ Tools](https://code.visualstudio.com/docs/languages/cpp) which have CMake support. Open the cloned repository in VS Code, then press `CMD + SHIFT + P`, find the `CMake: Configure` command in the palette and execute it. Then run the `CMake: Build` command from the palette.

In both cases, you'll find the executables `test` and `macinject` in the `build/` folder.

## Attaching to a running process
The first thing we need to attach to a running process is its process id (`pid`). We could mess around with various APIs or tools to figure out the pid of our test program. But let's make our lives simple. I've modified `test/test.cpp` above as follows:

```cpp
#include <cstdio>
#include <unistd.h>

int data = 123;

int foo() {
    return data;
}

int main(int argc, char** argv) {
	// Write out the pid, address of foo, and address of
	// data to a file called `data.txt` in the current working
	// directory
    FILE *file = fopen("data.txt", "w");
    fprintf(file, "%d\n", getpid());
    fprintf(file, "%p\n", (void*)foo);
    fprintf(file, "%p\n", &data);
    fclose(file);

    while (true) {
        printf("%d\n", foo());
        sleep(1);
    }
}
```

We simply write out the current pid and in-process addresses of `foo()` and `data` to a file called `data.txt`.

Our injection program can then just read that file to get the data to attach and modify these specific parts of the test program.

In the real world, things would obviously be a bit more complex. E.g., instead of manually writing addresses of functions and data locations to a file, we'd want to get those from the symbols table of the executable instead.

A poor man's way to do this would be to parse the output of `nm` for the test program executable:

```bash
macinject git:(main) ✗ nm build/test
0000000100003de8 T __Z3foov
0000000100008030 d __dyld_private
0000000100000000 T __mh_execute_header
0000000100008038 D _data
                 U _fclose
                 U _fopen
                 U _fprintf
                 U _getpid
0000000100003e04 T _main
                 U _printf
                 U _sleep
                 U dyld_stub_binder
```

Both `foo()` (name mangled as `__Z3foov`, because this is C++ and not C) and `data` are in there together with their addresses. However, these addresses aren't the addresses you'll get at runtime due to things like [Address Space Layout Randomization](https://de.wikipedia.org/wiki/Address_Space_Layout_Randomization), which basically moves those addresses around by a random, fixed offset at runtime. It's not hard to compensate for, but annoying.

By writing the actual in-process addresses to a file, we can save ourselves time not having to parse `nm` output and get the actual base address of the process. I'm sure ChatGPT can help you figure this out if you want to dive deeper.

OK, let's add the first bits of code to our injection program in `src/main.cpp`:

```cpp
#include <cstdio>
#include <cstdlib>
#include <mach-o/arch.h>
#include <mach/mach.h>
#include <unistd.h>

struct RemoteProcess {
	pid_t pid;
	void *fooAddr;
	void *dataAddr;
	mach_port_t task;
};

bool attach(RemoteProcess &proc) {
	FILE *file = fopen("data.txt", "r");
	if (!file) {
		fprintf(stderr, "Failed to open data.txt\n");
		return false;
	}
	fscanf(file, "%d", &proc.pid);
	fscanf(file, "%p", &proc.fooAddr);
	fscanf(file, "%p", &proc.dataAddr);
	fclose(file);

	kern_return_t kr;
	kr = task_for_pid(mach_task_self(), proc.pid, &proc.task);
	if (kr != KERN_SUCCESS) {
		fprintf(stderr, "Failed to get task for pid %d: %s\n", proc.pid, mach_error_string(kr));
		return false;
	}
	printf("Attached to pid %d\n", proc.pid);

	return true;
}
```

The `attach()` function reads the `data.txt` file the test program spits out on every run from the current working directory and stores the pid, address of `foo()`, and address of `data` in a provided `RemoteProcess` struct.

Next, we make our first Mach API call to `task_for_pid()`. It creates what's called a task control port, or simply task port, which subsequently allows us to mess with the process we identified via the `pid` in the second argument. The task port gets stored in the `RemoteProcess::task` field for further use.

The rest is merely some very terrible error checking and logging. A scheme we'll apply to other functions as well, because I'm lazy.

## Suspending and resuming a process
Before we can mess with the process, we should suspend all its threads. Reading and writing data from and to a remote process like our test program is generally not atomic, so we better suspend the program before we do anything like that.

Once we are done messing with the program, we want to resume the process again.

The corresponding Mach APIs to do just that are `task_suspend()` and `task_resume()`, which expect the task port of the process we want to suspend or resume. Let's wrap them in two functions with some error checking and logging.

```cpp
bool suspend(RemoteProcess &proc) {
	kern_return_t kr = task_suspend(proc.task);
	if (kr != KERN_SUCCESS) {
		fprintf(stderr, "Failed to suspend task for pid %d: %s\n", proc.pid, mach_error_string(kr));
		return false;
	}
	printf("Task for pid %d suspended\n", proc.pid);
	return true;
}

bool resume(RemoteProcess &proc) {
	kern_return_t kr = task_resume(proc.task);
	if (kr != KERN_SUCCESS) {
		fprintf(stderr, "Failed to resume task for pid %d: %s\n", proc.pid, mach_error_string(kr));
		return false;
	}
	printf("Task for pid %d resumed\n", proc.pid);
	return true;
}
```

## Writing and reading process memory
Once we've suspended a process, we can safely read and write from and to its memory. We use the `vm_write()` and `vm_read_overwrite()` Mach API calls for that. Pretty self-explanatory.

```cpp
bool writeBytes(RemoteProcess &proc, void *remoteAddress, void *data, size_t numBytes) {
	kern_return_t kr = vm_write(proc.task, (vm_address_t)remoteAddress, (vm_offset_t)data, numBytes);
	if (kr != KERN_SUCCESS) {
		fprintf(stderr, "Failed to write to memory: %s\n", mach_error_string(kr));
		return false;
	}
	printf("Wrote %zu bytes to address %p\n", numBytes, remoteAddress);
	return true;
}

bool readBytes(RemoteProcess &proc, void *remoteAddress, void *data, size_t numBytes) {
	vm_size_t outSize;
	kern_return_t kr =
	    vm_read_overwrite(proc.task, (vm_address_t)remoteAddress, numBytes, (vm_address_t)data, &outSize);
	if (kr != KERN_SUCCESS || outSize != numBytes) {
		fprintf(stderr, "Failed to read from memory: %s\n", mach_error_string(kr));
		return false;
	}
	printf("Read %zu bytes from address %p\n", numBytes, remoteAddress);
	return true;
}
```

We can now write our first injection program which reads then modifies the value of `data` in the running test program:

```cpp
int main(int argc, char **argv) {
	RemoteProcess proc;
	attach(proc);
	suspend(proc);

	int oldValue = 0;
	readBytes(proc, proc.dataAddr, &oldValue, sizeof(oldValue));
	printf("Old value: %d\n", oldValue);

	int newValue = 456;
	writeBytes(proc, proc.dataAddr, &newValue, sizeof(newValue));
	resume(proc);
}
```

If we run `test` followed by `macinject`, we get:

<video src="media/read-write.mp4" controls loop></video>

Look, mom, I'm a hacker now.

## Injecting code
For our final trick, we'll inject some code. To jog your memory, here's `foo()` from the test program again:

```cpp
int data = 123;

int foo() {
    return data;
}
```

We want to completely replace this function with different code, say a function that returns `857`.

The first problem we need to solve is to get the machine code for such a function. We could hand-write some assembly code, assemble it into machine code, read that in our injection program, and somehow inject it into the test program. That sounds like work. Let's do something else instead.

We already compile the C/C++ code of our injection program. Let's just add the code we want to inject there (that is in `src/main.cpp`):

```cpp
int bar() { return 857; }
void barEnd() {}
```

`bar()` is self-explanatory, but what's up with `barEnd()`? Well, we need to know the length of `bar()`s machine code, so we know how many bytes we need to inject into the test program.

We can use the fact that the compiler lays out functions one after the other in the compiled executable. By subtracting the address of `bar()` from `barEnd()`, we know how big `bar()` is (conservatively, including any padding necessary for alignment requirements):

```cpp
int barSize = (char *)barEnd - (char *)bar;
printf("Bar size: %d\n", barSize);
```

Cool, so we can basically copy `bar()` from our injection program's process into the test program's process. But where do we copy `bar()` to?

We can't just overwrite the bytes of `foo()`. `bar()` may be bigger than `foo()`, so we'd stomp over whatever comes after `foo()` in the test program process memory.

Instead, we need to allocate memory in the process we inject into. And you guessed it, the Mach APIs have a function for that too called `vm_allocate()`. Let's wrap that function with some error checking and logging:

```cpp
bool allocate(RemoteProcess &proc, size_t size, void **remoteAddress) {
	vm_address_t address;
	kern_return_t kr = vm_allocate(proc.task, &address, size, VM_FLAGS_ANYWHERE);
	if (kr != KERN_SUCCESS) {
		fprintf(stderr, "Failed to allocate memory in remote process: %s\n", mach_error_string(kr));
		return false;
	}
	*remoteAddress = (void *)address;
	printf("Allocated %zu bytes at address %p in remote process\n", size, (void *)remoteAddress);
	return true;
}
```

The function will allocate `size` bytes in the remote process and store the address of the chunk we allocate in the remote process in `remoteAddress`.

We can now copy over `bar()` from the injection program process to the test program process:

```cpp
void *remoteBar;
allocate(proc, barSize, &remoteBar);
writeBytes(proc, remoteBar, (void *)bar, barSize);
```

Easy peasy, lemon squeezy. But there are two problems.

The first problem: the memory region we allocated in the test program process is not executable. By default, the memory we allocated via `vm_allocate()` is readable and writable, but not executable. Let's change that with another Mach API function called `vm_protect()`.

```cpp
bool changeProtection(RemoteProcess &proc, void *address, size_t numBytes, vm_prot_t newProtection) {
	kern_return_t kr = vm_protect(proc.task, (vm_address_t)address, numBytes, false, newProtection);
	if (kr != KERN_SUCCESS) {
		fprintf(stderr, "Failed to change memory protection: %s\n", mach_error_string(kr));
		return false;
	}
	printf("Changed protection of address %p, size %zu to %d\n", address, numBytes, newProtection);
	return true;
}
```

Now we can change the protection flags of any memory region starting at `address` with size `numBytes` to whatever we want. For example, to make our copy of `bar()` in the test program process executable, we can do:

```cpp
changeProtection(proc, remoteBar, barSize, VM_PROT_READ | VM_PROT_EXECUTE);
```

Making it readable and executable. Sweet.

All that's left is making the test program use our copied over `bar()` instead of the original `foo()`. But how can we do that?

Welcome to trampolines! They are kinda bouncy like their real-world equivalents. The basic idea goes like this:

1. We locate the function we want to overwrite, let's call it the old function, with another function (the new function).
2. We write the new function to the process we inject into.
3. We write a tiny bit of machine code to the beginning of the old function that will immediately jump to the beginning of the new function. This is called the trampoline, as it jumps to the new function.

The function we want to overwrite is `foo()`, for which we have the in-process address in `RemoteProcess::fooAddr`, read from the `data.txt` file.

We've also already seen how to write a new function to the process, by allocating memory, copying over the machine code, and making the memory region executable.

So let's focus on number 3, the trampoline. We are on macOS, so we'll have to do this for both x86_64 and ARM64 (Apple Silicon). Given that everyone is now using Apple Silicon (**cough**), I'll just show the code for that (you can find the untested [x86_64 trampoline on GitHub](https://github.com/badlogic/macinject/blob/main/src/main.cpp#L110-L114)).

```arm
ldr x16, #0x8
br x16
<64-bit address to jump to>
```

The first instruction loads the 64-bit address stored after `br x16` into register `x16`. The second instruction then performs an unconditional jump to that address. Finally, we need to write out the actual address we want to jump to, that `ldr` loads. Yup, we are writing data (the address), not code there. We can do anything.

In total, we need `4 + 4 + 8 = 16` bytes for this little trampoline. That's a problem because the function we write the trampoline to may be smaller than 16 bytes. Here's what `foo()` looks like on ARM, as disassembled by LLDB.

```arm
(lldb) di -n foo -b
test`foo:
test[0x100003e08] <+0>: 0xb0000028   adrp   x8, 5
test[0x100003e0c] <+4>: 0xb9403900   ldr    w0, [x8, #0x38]
test[0x100003e10] <+8>: 0xd65f03c0   ret
```

That's only 12 bytes. If we write our 16 bytes trampoline there, we'd stomp over whatever comes after `foo()` (or get a protection fault). That's no bueno.

Luckily, Clang lets us prepend every function with a number of `NOP`s, which explains the parameter `-fpatchable-function-entry` in our CMakeLists.txt above:

```cmake
set_target_properties(test PROPERTIES COMPILE_FLAGS "-O0 -g -fpatchable-function-entry=4,0")
```

With this, `foo()`'s machine code now looks like this:

```arm
(lldb) di -n foo -b
test`foo:
test[0x100003de8] <+0>:  0xd503201f   nop
test[0x100003dec] <+4>:  0xd503201f   nop
test[0x100003df0] <+8>:  0xd503201f   nop
test[0x100003df4] <+12>: 0xd503201f   nop
test[0x100003df8] <+16>: 0xb0000028   adrp   x8, 5
test[0x100003dfc] <+20>: 0xb9403900   ldr    w0, [x8, #0x38]
test[0x100003e00] <+24>: 0xd65f03c0   ret
```

The `NOP`s will literally do nothing but add a bit of execution overhead in each function and space for our trampoline.

Putting this all together, we can create a function `trampoline()`:

```cpp
bool trampoline(RemoteProcess &proc, void *oldFunction, void *newFunction) {
	const NXArchInfo *archInfo = NXGetLocalArchInfo();
	if (archInfo == nullptr) {
		fprintf(stderr, "Failed to get local architecture info\n");
		return false;
	}

	size_t jumpInstructionSize;

	if (strcmp(archInfo->name, "x86_64") == 0) {
		unsigned char jumpInstruction[14];
		jumpInstruction[0] = 0xFF;                                  // JMP opcode for x86_64
		jumpInstruction[1] = 0x25;                                  // ModR/M byte for absolute indirect jump
		*(uint32_t *)(jumpInstruction + 2) = 0;                     // 32-bit offset (unused)
		*(uint64_t *)(jumpInstruction + 6) = (uint64_t)newFunction; // 64-bit address

		jumpInstructionSize = sizeof(jumpInstruction);

		if (!changeProtection(proc, oldFunction, jumpInstructionSize, VM_PROT_READ | VM_PROT_WRITE | VM_PROT_COPY)) {
			fprintf(stderr, "Failed to change memory protection to RWX\n");
			return false;
		}

		if (!writeBytes(proc, oldFunction, jumpInstruction, jumpInstructionSize)) {
			fprintf(stderr, "Failed to write jump instruction\n");
			return false;
		}

		if (!changeProtection(proc, oldFunction, jumpInstructionSize, VM_PROT_READ | VM_PROT_COPY)) {
			fprintf(stderr, "Failed to change memory protection to RX\n");
			return false;
		}
	} else if (strcmp(archInfo->name, "arm64") == 0 || strcmp(archInfo->name, "arm64e") == 0) {
		unsigned char jumpInstruction[16];
		// LDR X16, #8
		jumpInstruction[0] = 0x50;
		jumpInstruction[1] = 0x00;
		jumpInstruction[2] = 0x00;
		jumpInstruction[3] = 0x58;
		// BR X16
		jumpInstruction[4] = 0x00;
		jumpInstruction[5] = 0x02;
		jumpInstruction[6] = 0x1F;
		jumpInstruction[7] = 0xD6;
		// Address to jump to
		*(uint64_t *)(jumpInstruction + 8) = (uint64_t)newFunction;

		jumpInstructionSize = sizeof(jumpInstruction);

		if (!changeProtection(proc, oldFunction, jumpInstructionSize, VM_PROT_READ | VM_PROT_WRITE | VM_PROT_COPY)) {
			fprintf(stderr, "Failed to change memory protection to RWX\n");
			return false;
		}

		if (!writeBytes(proc, oldFunction, jumpInstruction, jumpInstructionSize)) {
			fprintf(stderr, "Failed to write jump instruction\n");
			return false;
		}

		if (!changeProtection(proc, oldFunction, jumpInstructionSize, VM_PROT_READ | VM_PROT_EXECUTE)) {
			fprintf(stderr, "Failed to change memory protection to RX\n");
			return false;
		}
	} else {
		fprintf(stderr, "Unsupported architecture: %s\n", archInfo->name);
		return false;
	}

	printf("Patched function at %p to jump to %p\n", (void *)oldFunction, (void *)newFunction);
	return true;
}
```

Since we cover both x86_64 and ARM, we first need to figure out what architecture we're running on. That's what the call to `NXGetLocalArchInfo` and the subsequent branches are for.

Looking at the ARM-specific branch, we first assemble the trampoline. Next, we change the protection flags of the memory region of the function we want to inject the trampoline in (`foo()` in our case). Note the `VM_PROT_COPY`, which is required to make this work on newer macOS versions. It likely does some nasty stuff I didn't look into too closely.

We then write our trampoline to the beginning of the old function and change the protection flags of the function's memory region back to readable/executable. That's it!

With all our little helper functions in place, we can now complete our injection program (error checking omitted, because fuck it, I'm on vacation):

```cpp
int bar() { return 857; }
void barEnd() {}

int main(int argc, char **argv) {
	RemoteProcess proc;
	attach(proc);
	suspend(proc);

	int oldValue = 0;
	readBytes(proc, proc.dataAddr, &oldValue, sizeof(oldValue));
	printf("Old value: %d\n", oldValue);

	int newValue = 456;
	writeBytes(proc, proc.dataAddr, &newValue, sizeof(newValue));
	resume(proc);

	sleep(4);

	suspend(proc);
	int barSize = (char *)barEnd - (char *)bar;
	printf("Bar size: %d\n", barSize);
	void *remoteBar;
	allocate(proc, barSize, &remoteBar);
	writeBytes(proc, remoteBar, (void *)bar, barSize);
	changeProtection(proc, remoteBar, barSize, VM_PROT_READ | VM_PROT_EXECUTE);
	trampoline(proc, proc.fooAddr, remoteBar);

	resume(proc);
	return 0;
}
```

And here it is in action.

<video src="media/action.mp4" controls loop></video>

I first run `test`, the test program, followed by `macinject`, the injection program. It will first modify the value in `data` and wait for 4 seconds. The test program will print the new value `456`.

Then it copies over `bar()` to the test program process and sets up the trampoline, resulting in the test program actually running `bar()`, thus logging `857`.

## Caveat emptor

This is obviously nowhere near production-ready code or anywhere near the complexity needed to do what Live++ does. For example, the above entirely ignores interactions with a debugger or what happens if a thread is suspended in the middle of a trampoline that's currently being overwritten.

But it gives you a basic idea of what's going on in amazing software like Live++ (and malware, and anti-virus garbage which is essentially malware)! These basic principles also apply to Windows and Linux, where similar system APIs are available.

Hack the planet!

<%= render("../../_partials/post-footer.html") %>