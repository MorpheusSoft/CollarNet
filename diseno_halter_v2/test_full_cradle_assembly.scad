include <test_full_cradle_bridge.scad>

// Módulo oficial del Logotipo y Emblema COWAI (Ondas Satelitales IoT + Texto + Subtítulo)
module cowai_bridge_badge_2d() {
    translate([-26, 1.2, 0]) {
        circle(r = 0.9);
        difference() {
            circle(r = 2.6);
            circle(r = 1.9);
            translate([-4, -4, 0]) square([4, 8]);
        }
        difference() {
            circle(r = 4.3);
            circle(r = 3.6);
            translate([-6, -6, 0]) square([6, 12]);
        }
    }
    translate([3.0, 1.2, 0])
        text("COWAI", font = "Ubuntu:style=Bold", size = 8.5, halign = "center", valign = "center", spacing = 1.15);
    translate([0, -5.2, 0])
        text("SMART CATTLE IoT", font = "Ubuntu:style=Bold", size = 2.2, halign = "center", valign = "center", spacing = 1.2);
    translate([20.0, -5.2, 0]) square([3.5, 0.45], center = true);
    translate([-20.0, -5.2, 0]) square([3.5, 0.45], center = true);
}

// Emblema 3D del logotipo
module dorsal_bridge_text() {
    color("White") {
        translate([0, 0, 137.0]) {
            linear_extrude(height=4.2) {
                cowai_bridge_badge_2d();
            }
        }
    }
}

// Base genérica con escalón macho de encastre (ASA)
module asa_stepped_base_shell() {
    difference() {
        union() {
            // Cuerpo principal a tamaño completo (X = cradle_depth a pod_l)
            translate([cradle_depth, 0, 0])
                r_box(pod_l - cradle_depth, pod_w, pod_base_h, pod_r);
            
            // Lengüeta rebajada que embona en la cuna de TPU (X = 0 a cradle_depth)
            translate([0, cradle_wall, cradle_floor])
                r_box(cradle_depth + 0.5, pod_w - 2*cradle_wall, pod_base_h - cradle_floor, max(1, pod_r - cradle_wall));
        }

        // Túnel pasacorreas continuo
        translate([-5, (pod_w - strap_slot_w)/2, tunnel_t])
            cube([pod_l + 10, strap_slot_w, strap_slot_h]);

        // Taladros M4 alineados con la cuna
        for (dy = [pod_w/2 - 14, -pod_w/2 + 14]) {
            translate([cradle_depth/2, pod_w/2 + dy, -5])
                cylinder(r=2.2, h=pod_base_h + 10, $fn=24);
        }

        // Pasacables frontal en la lengüeta
        translate([-5, pod_w/2, 8.0])
            rotate([0, 90, 0]) cylinder(r=conduit_d/2, h=15, $fn=24);
    }
}

// Tapa superior
module lid_mockup() {
    color([0.94, 0.42, 0.12])
    difference() {
        r_box(pod_l, pod_w, lid_h, pod_r);
        // Cuna panel solar enrasado
        translate([(pod_l - 60)/2 + 8, (pod_w - 55)/2, lid_h - 2.2])
            cube([60, 55, 5]);
    }
}

// Panel solar mockup
module solar_mockup() {
    color([0.08, 0.14, 0.24])
    translate([(pod_l - 60)/2 + 8, (pod_w - 55)/2, lid_h - 2.0])
        cube([60, 55, 2.0]);
}

// ENSAMBLE COMPLETO HÍBRIDO TPU-ASA
module full_hybrid_assembly() {
    // 1. Puente Dorsal en TPU Grafito con cunas integradas y bajorrelieve
    difference() {
        full_tpu_bridge_with_cradles();
        translate([0, 0, 137.0])
            linear_extrude(height=10.0)
                cowai_bridge_badge_2d();
    }
    // Logotipo COWAI en blanco
    dorsal_bridge_text();

    ang = bridge_half_ang;
    x_j = bridge_r_inner * sin(ang);
    z_j = bridge_r_inner * cos(ang);

    // 2. Cápsula Derecha en ASA Naranja embonada en la cuna derecha
    translate([x_j, 0, z_j]) {
        rotate([0, ang, 0]) {
            translate([0, -pod_w/2, 0]) {
                color([0.94, 0.42, 0.12]) asa_stepped_base_shell();
                translate([0, 0, pod_base_h]) {
                    lid_mockup();
                    solar_mockup();
                }
            }
        }
    }

    // 3. Cápsula Izquierda en ASA Naranja embonada en la cuna izquierda
    mirror([1, 0, 0]) {
        translate([x_j, 0, z_j]) {
            rotate([0, ang, 0]) {
                translate([0, -pod_w/2, 0]) {
                    color([0.94, 0.42, 0.12]) asa_stepped_base_shell();
                    translate([0, 0, pod_base_h]) {
                        lid_mockup();
                        solar_mockup();
                    }
                }
            }
        }
    }

    // 4. Correa ganadera
    color([0.32, 0.26, 0.22], 0.85) {
        translate([x_j, 0, z_j])
            rotate([0, ang, 0])
                translate([-10, -38/2, tunnel_t + 0.5])
                    cube([pod_l + 30, 38, 3.5]);

        mirror([1, 0, 0])
            translate([x_j, 0, z_j])
                rotate([0, ang, 0])
                    translate([-10, -38/2, tunnel_t + 0.5])
                        cube([pod_l + 30, 38, 3.5]);
    }
}

full_hybrid_assembly();
