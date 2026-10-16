include <collar_halter_v2.scad>
include <probetas_prototipo_rapido.scad>

$fn = 36;

module lead_in_chamfer_cutter() {
    // Chaflán lateral 1 (Y = cradle_wall)
    translate([0, cradle_wall, cradle_floor - 1])
        rotate([0, 0, 30])
            translate([-8, -10, 0])
                cube([16, 10, pod_base_h + 2]);

    // Chaflán lateral 2 (Y = pod_w - cradle_wall)
    translate([0, pod_w - cradle_wall, cradle_floor - 1])
        rotate([0, 0, -30])
            translate([-8, 0, 0])
                cube([16, 10, pod_base_h + 2]);

    // Chaflán inferior delantero en X=0
    translate([0, -1, cradle_floor])
        rotate([0, 35, 0])
            translate([-8, 0, -8])
                cube([8, pod_w + 2, 16]);
}

// Bolsillo TPU translúcido
%probeta_bolsillo_tpu();

// Cuello con chaflán 100% introducido hasta el fondo (X = 0)
translate([0, -pod_w/2, 0]) {
    difference() {
        probeta_cuello_capsula();
        lead_in_chamfer_cutter();
    }
}
