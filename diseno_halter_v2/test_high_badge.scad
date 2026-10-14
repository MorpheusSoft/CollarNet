include <collar_halter_v2.scad>

// Let's test extruding the badge high enough so it reaches Z=145
module badge_high() {
    translate([0, 0, 138.0])
        linear_extrude(height = 7.0) // from Z=138 to Z=145!
            cowai_bridge_badge_2d();
}

color("White")
    badge_high();
