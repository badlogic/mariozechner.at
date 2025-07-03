# Spine-CPP Coding Conventions

## File Organization

### Directory Structure
- Headers: `include/spine/` - Public API headers
- Implementation: `src/spine/` - Implementation files (.cpp)
- One class per file pattern (Animation.h/Animation.cpp)

### Header Guards
```cpp
#ifndef Spine_Animation_h
#define Spine_Animation_h
// content
#endif
```

## Naming Conventions

### Classes and Types
- **Classes**: PascalCase (e.g., `Animation`, `BoneTimeline`, `SkeletonData`)
- **Enums**: PascalCase with prefixed values
  ```cpp
  enum MixBlend {
      MixBlend_Setup,
      MixBlend_First,
      MixBlend_Replace,
      MixBlend_Add
  };
  ```

### Variables
- **Member variables**: Underscore prefix + camelCase
  ```cpp
  private:
      float _duration;
      Vector<Timeline*> _timelines;
      bool _hasDrawOrder;
  ```
- **Parameters**: camelCase, often with "inValue" suffix for setters
  ```cpp
  void setDuration(float inValue) { _duration = inValue; }
  ```
- **Local variables**: camelCase (e.g., `timelineCount`, `lastTime`)

### Methods
- **Public methods**: camelCase
  ```cpp
  float getDuration() { return _duration; }
  void apply(Skeleton& skeleton, float lastTime, float time, ...);
  ```
- **Getters/Setters**: get/set prefix pattern
  ```cpp
  const String& getName() { return _name; }
  void setName(const String& inValue) { _name = inValue; }
  ```

## Class Structure

### Base Class Pattern
All classes inherit from `SpineObject`:
```cpp
class SP_API Animation : public SpineObject {
    // ...
};
```

### Access Modifiers Order
1. Friend declarations
2. Public members
3. Protected members
4. Private members

### Friend Classes
Extensive use for internal access:
```cpp
friend class AnimationState;
friend class AnimationStateData;
```

## Memory Management

### Manual Memory Management
- No smart pointers
- Explicit new/delete with custom allocators
- SpineObject base class provides memory tracking

### Object Pools
```cpp
class SP_API Pool<T> : public SpineObject {
    // Efficient object recycling
};
```

### Vector Usage
Custom Vector class instead of std::vector:
```cpp
Vector<Timeline*> _timelines;
```

## Type System

### Custom String Class
```cpp
class SP_API String : public SpineObject {
    // UTF-8 aware string implementation
};
```

### Container Types
- `Vector<T>` - Dynamic array
- `HashMap<K,V>` - Hash map implementation
- `Pool<T>` - Object pool

### RTTI Usage
Runtime type information with RTTI macros:
```cpp
RTTI_DECL
RTTI_IMPL(Animation, SpineObject)
```

## Error Handling

### No Exceptions
- Uses assertions for debug builds
- Return values indicate success/failure
- assert() for internal invariants

### Assertions
```cpp
assert(timelineCount == _timelines.size());
```

## Documentation

### Triple-Slash Comments
```cpp
/// @brief Sets the duration of the animation.
/// @param inValue The duration in seconds.
void setDuration(float inValue);
```

### File Headers
```cpp
/******************************************************************************
 * Spine Runtimes License Agreement
 * ...
 *****************************************************************************/
```

## Platform Handling

### DLL Export/Import
```cpp
#ifdef SPINE_CPP_DLL
    #ifdef _MSC_VER
        #define SP_API __declspec(dllexport)
    #else
        #define SP_API __attribute__((visibility("default")))
    #endif
#else
    #define SP_API
#endif
```

### Platform-Specific Code
Minimal, mostly in Extension.cpp

## Include Style

### System Headers
```cpp
#include <spine/SpineObject.h>
#include <spine/Vector.h>
```

### Forward Declarations
Used extensively to minimize dependencies:
```cpp
namespace spine {
    class Skeleton;
    class Event;
}
```

## Special Patterns

### Inline Getters/Setters
Simple accessors defined in headers:
```cpp
float getDuration() { return _duration; }
```

### Const Correctness
- Const methods where appropriate
- Const references for parameters
```cpp
void apply(Skeleton& skeleton, float lastTime, float time,
          Vector<Event*>* pEvents, float alpha,
          MixBlend blend, MixDirection direction);
```

### No STL Usage
Custom implementations for all containers, minimal stdlib dependency

## Build System

### CMake Integration
- include directories specified in CMakeLists.txt
- Separate static/shared library targets

### Compiler Flags
- C++11 standard
- RTTI enabled
- No exceptions (-fno-exceptions on some platforms)