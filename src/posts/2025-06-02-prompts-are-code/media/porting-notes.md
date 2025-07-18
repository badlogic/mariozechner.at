# Porting Notes

## Java to C++ Porting Conventions

### Direct Field Access vs Getters/Setters
- C++ uses direct field access (e.g., `p._mixRotate`) where Java uses direct field access (e.g., `p.mixRotate`)
- C++ uses underscore prefix for private fields but accesses them directly via friend classes
- This is intentional - C++ classes are friends of each other to allow direct field access
- Do NOT change direct field access to getter/setter calls in C++
- Java `slot.pose.attachment` → C++ `_slot->_pose._attachment` (NOT `_slot->getPose()._attachment`)

### Override Keywords
- When fixing override warnings, add `virtual` and `override` keywords to methods in derived classes
- Example: `PathConstraintData &getData();` → `virtual PathConstraintData &getData() override;`

### Pose vs Applied Usage (CRITICAL)
- C++ MUST use the same pose reference as Java
- If Java uses `applied`, C++ must use `_applied`
- If Java uses `pose`, C++ must use `_pose`
- Never mix these up - they represent different states in the constraint system
- Example:
  - Java: `IkConstraintPose p = applied;` → C++: `IkConstraintPose &p = *_applied;`
  - Java: `copy.pose.set(pose);` → C++: `copy->_pose.set(_pose);`

### Constraint Pose Initialization
- In Java, constraint constructors pass new pose instances to the parent constructor
- In C++, `ConstraintGeneric` allocates poses as member fields (_pose and _constrained), not through constructor
- Example: Java `super(data, new PhysicsConstraintPose(), new PhysicsConstraintPose())`
- C++ just calls `ConstraintGeneric<PhysicsConstraint, PhysicsConstraintData, PhysicsConstraintPose>(data)`

### Method Name Differences
- Java `Posed.reset()` → C++ `PosedGeneric::resetConstrained()`
- This naming difference must exist to avoid conflicts with other reset methods in C++
- The Java code has a comment `// Port: resetConstrained` indicating this is intentional

### Methods NOT Ported
- `toString()` methods are not ported to C++
- Methods that use `Matrix3` type in Java are not ported to C++

### Parameter Conversions
- Methods that take `Vector2` in Java are "unrolled" in C++ to use separate float parameters:
  - Java: `worldToLocal(Vector2 world)`
  - C++: `worldToLocal(float worldX, float worldY, float& outLocalX, float& outLocalY)`

## Dark Color Handling Pattern
- Java uses `@Null Color darkColor` (nullable reference)
- C++ uses `Color _darkColor` with `bool _hasDarkColor` flag
- This avoids manual memory management while maintaining the same functionality
- The _hasDarkColor boolean indicates whether a dark color has been set
- Example: SlotPose class uses this pattern

## Event Class (Ported - 4.3-beta update)
- Method names updated to match Java API:
  - `getIntValue()` → `getInt()`
  - `setIntValue()` → `setInt()`
  - `getFloatValue()` → `getFloat()`
  - `setFloatValue()` → `setFloat()`
  - `getStringValue()` → `getString()`
  - `setStringValue()` → `setString()`
- Constructor now initializes values from EventData defaults to match Java behavior