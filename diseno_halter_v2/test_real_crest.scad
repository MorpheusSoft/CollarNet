use <collar_halter_v2.scad>

// Using 'use' instead of 'include' so it doesn't execute the main assembly!
$fn = 40;

// Bridge body with deep cut through the curve
color([0.94, 0.42, 0.12]) // Naranja
difference() {
    dorsal_bridge_body();
    translate([0, 0, 137.0])
        linear_extrude(height = 10.0)
            cowai_bridge_badge_2d();
}

// Logo in white, seated in the bottom of the cut
color("White")
    translate([0, 0, 137.0])
        linear_extrude(height = 4.2)
            cowai_bridge_badge_2d();
