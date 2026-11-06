# Nested guide

A file in a subfolder gets its SVG in the same subfolder.

```draft
node a "Build"
node b "Test"
node c "Ship"
edge e1 a -> b
edge e2 b -> c
```
