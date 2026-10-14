$fn = 40;

module cowai_badge_2d() {
    // Icono ondas satelitales / IoT (con 3 ondas curvas)
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
    
    // Texto principal COWAI en tipografía Ubuntu Bold
    translate([3.0, 1.2, 0])
        text("COWAI", font = "Ubuntu:style=Bold", size = 8.5, halign = "center", valign = "center", spacing = 1.15);
    
    // Subtítulo SMART CATTLE IoT
    translate([0, -5.2, 0])
        text("SMART CATTLE IoT", font = "Ubuntu:style=Bold", size = 2.2, halign = "center", valign = "center", spacing = 1.2);
        
    // Líneas de acento tecnológicas a los lados del subtítulo
    translate([20.0, -5.2, 0]) square([3.5, 0.45], center = true);
    translate([-20.0, -5.2, 0]) square([3.5, 0.45], center = true);
}

linear_extrude(height=0.7) cowai_badge_2d();
