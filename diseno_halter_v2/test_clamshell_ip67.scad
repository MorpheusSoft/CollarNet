
$fn = 32;

// Parámetros
l = 60;
w = 40;
h_base = 20;
h_lid = 8;
r = 5;
wall = 2.5;

// U-channel parameters
u_w = 2.2;
u_d = 2.5;
tongue_w = 1.6;
tongue_h = 2.0;

// Snap clip parameters
clip_w = 8.0;
clip_t = 1.5;
clip_h = 6.0;
hook_d = 1.2;

module r_box(len, wid, hei, rad) {
    hull() {
        translate([rad, rad, 0]) cylinder(r=rad, h=hei);
        translate([len-rad, rad, 0]) cylinder(r=rad, h=hei);
        translate([rad, wid-rad, 0]) cylinder(r=rad, h=hei);
        translate([len-rad, wid-rad, 0]) cylinder(r=rad, h=hei);
    }
}

// 1. BASE WITH U-CHANNEL AND SNAP SLOTS
module base_test() {
    difference() {
        r_box(l, w, h_base, r);
        // Interior cavity
        translate([wall + u_w, wall + u_w, 2])
            r_box(l - 2*(wall + u_w), w - 2*(wall + u_w), h_base + 2, max(1, r - wall - u_w));
        // Perimeter U-channel
        translate([wall, wall, h_base - u_d]) {
            difference() {
                r_box(l - 2*wall, w - 2*wall, u_d + 1, max(1, r - wall));
                translate([u_w, u_w, -0.5])
                    r_box(l - 2*(wall + u_w), w - 2*(wall + u_w), u_d + 2, max(1, r - wall - u_w));
            }
        }
        // Snap slot side 1
        translate([l/2 - clip_w/2, -0.5, h_base - 10])
            cube([clip_w, wall + 1, 4]);
        // Snap slot side 2
        translate([l/2 - clip_w/2, w - wall - 0.5, h_base - 10])
            cube([clip_w, wall + 1, 4]);
    }
}

// 2. LID WITH TONGUE AND SNAP HOOKS
module lid_test() {
    union() {
        difference() {
            r_box(l, w, h_lid, r);
            translate([wall + u_w + 1, wall + u_w + 1, -1])
                r_box(l - 2*(wall + u_w + 1), w - 2*(wall + u_w + 1), h_lid - 2, max(1, r - wall - u_w - 1));
        }
        // Downward tongue
        translate([wall + (u_w - tongue_w)/2, wall + (u_w - tongue_w)/2, -tongue_h]) {
            difference() {
                r_box(l - 2*(wall + (u_w - tongue_w)/2), w - 2*(wall + (u_w - tongue_w)/2), tongue_h + 0.1, max(1, r - wall));
                translate([tongue_w, tongue_w, -0.5])
                    r_box(l - 2*(wall + (u_w - tongue_w)/2 + tongue_w), w - 2*(wall + (u_w - tongue_w)/2 + tongue_w), tongue_h + 1.2, max(1, r - wall - tongue_w));
            }
        }
        // Snap clip cantilever arm side 1
        translate([l/2 - clip_w/2 + 0.2, 0.5, -8]) {
            cube([clip_w - 0.4, clip_t, 8]);
            translate([0, -hook_d, 0])
                cube([clip_w - 0.4, hook_d, 2.5]);
        }
    }
}

base_test();
translate([0, 0, h_base + 15]) lid_test();
