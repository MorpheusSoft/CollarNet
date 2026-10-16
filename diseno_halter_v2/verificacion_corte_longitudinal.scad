
caller_part = "none";
include <collar_halter_v2.scad>;

difference() {
    full_assembly();
    // Cut away Y > 0 so Y <= 0 remains
    translate([-300, 0, -100])
        cube([600, 250, 400]);
}
