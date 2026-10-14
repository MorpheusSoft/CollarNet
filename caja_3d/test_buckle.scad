$fn = 64;

// Parametros
cinta_w = 38.0;
slot_w  = 40.5;
slot_l  = 6.5;
th      = 7.0;

bar_end_w    = 7.5;
bar_center_w = 9.5;
side_w       = 7.5;

total_w = slot_w + 2 * side_w; // 55.5 mm
total_l = 2 * bar_end_w + bar_center_w + 2 * slot_l; // 37.5 mm

y_c1 = -(bar_center_w/2 + slot_l/2);
y_c2 =  (bar_center_w/2 + slot_l/2);

module rounded_rect(w, l, r) {
    hull() {
        translate([-w/2+r, -l/2+r]) circle(r=r);
        translate([ w/2-r, -l/2+r]) circle(r=r);
        translate([-w/2+r,  l/2-r]) circle(r=r);
        translate([ w/2-r,  l/2-r]) circle(r=r);
    }
}

module hebilla() {
    difference() {
        // Base principal
        linear_extrude(height = th)
            rounded_rect(total_w, total_l, 5);

        // Ranura 1
        translate([0, y_c1, -1])
            linear_extrude(height = th + 2)
                rounded_rect(slot_w, slot_l, 2.2);

        // Ranura 2
        translate([0, y_c2, -1])
            linear_extrude(height = th + 2)
                rounded_rect(slot_w, slot_l, 2.2);

        // Chaflanes superiores suaves en los bordes de las ranuras (para deslizamiento de cinta)
        for (y_slot = [y_c1, y_c2]) {
            // Bisel superior en ranura
            translate([0, y_slot, th - 1.2])
                hull() {
                    translate([0, 0, 1.25])
                        linear_extrude(height = 0.1)
                            rounded_rect(slot_w + 2.4, slot_l + 2.4, 3.4);
                    translate([0, 0, 0])
                        linear_extrude(height = 0.1)
                            rounded_rect(slot_w, slot_l, 2.2);
                }
            // Bisel inferior en ranura
            translate([0, y_slot, -0.05])
                hull() {
                    translate([0, 0, 0])
                        linear_extrude(height = 0.1)
                            rounded_rect(slot_w + 2.4, slot_l + 2.4, 3.4);
                    translate([0, 0, 1.25])
                        linear_extrude(height = 0.1)
                            rounded_rect(slot_w, slot_l, 2.2);
                }
        }

        // Bisel exterior superior perimetrico
        difference() {
            translate([-total_w/2 - 2, -total_l/2 - 2, th - 1.2])
                cube([total_w + 4, total_l + 4, 3]);
            translate([0, 0, th - 1.25])
                hull() {
                    translate([0, 0, 1.3])
                        linear_extrude(height = 0.1)
                            rounded_rect(total_w - 2.4, total_l - 2.4, 3.8);
                    translate([0, 0, 0])
                        linear_extrude(height = 0.1)
                            rounded_rect(total_w, total_l, 5);
                }
        }
        
        // Bisel exterior inferior perimetrico (evita pie de elefante y aristas vivas en la piel)
        difference() {
            translate([-total_w/2 - 2, -total_l/2 - 2, -1])
                cube([total_w + 4, total_l + 4, 2.0]);
            translate([0, 0, -0.05])
                hull() {
                    translate([0, 0, 0])
                        linear_extrude(height = 0.1)
                            rounded_rect(total_w - 2.0, total_l - 2.0, 4.0);
                    translate([0, 0, 1.1])
                        linear_extrude(height = 0.1)
                            rounded_rect(total_w, total_l, 5);
                }
        }

        // Detalle de texto "COWAI 38" grabado suavemente en el lomo lateral (0.4mm profundidad)
        translate([-total_w/2 + 3.8, 0, th - 0.4])
            rotate([0, 0, 90])
                linear_extrude(height = 0.6)
                    text("COWAI", size = 4.2, font = "Liberation Sans:style=Bold", halign = "center", valign = "center");

        translate([total_w/2 - 3.8, 0, th - 0.4])
            rotate([0, 0, -90])
                linear_extrude(height = 0.6)
                    text("38 mm", size = 4.0, font = "Liberation Sans:style=Bold", halign = "center", valign = "center");
    }

    // Dientes de traccion antideslizante en la barra central
    // 4 dientes triangulares con base de 1.8mm y altura de 1.0mm
    num_teeth = 4;
    pitch = 2.0;
    for (i = [0 : num_teeth - 1]) {
        y_t = -(num_teeth - 1) * pitch / 2 + i * pitch;
        translate([-slot_w/2 + 1.5, y_t, th])
            rotate([0, 90, 0])
                linear_extrude(height = slot_w - 3)
                    polygon(points=[[-0.9, 0], [0.9, 0], [0, 1.0]]);
    }
}

color([0.15, 0.5, 0.85])
    hebilla();
