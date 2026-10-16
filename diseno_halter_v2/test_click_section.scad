include <test_standalone_click_box.scad>

// Corte transversal por el centro donde está el gancho (X = box_l/2)
difference() {
    union() {
        mini_caja_click_base();
        // Tapa colocada en su posición cerrada
        translate([0, 0, box_h])
            mini_caja_click_tapa();
    }
    // Cortamos la mitad en X para ver la sección interna
    translate([box_l/2, -10, -10])
        cube([box_l, box_w + 20, box_h + 30]);
}
