// Lote de 8 pines de ensamble para la cabeza de vaca COW AI
// Diametro 4.0 mm, Longitud 15.0 mm, biselados en ambos extremos para insercion suave

$fn = 30;

module single_pin() {
    rotate([0, 90, 0]) {
        cylinder(d = 4.0, h = 13.0, center = true);
        // Biseles en los extremos
        translate([0, 0, 6.5]) cylinder(d1 = 4.0, d2 = 3.0, h = 1.0);
        translate([0, 0, -7.5]) cylinder(d1 = 3.0, d2 = 4.0, h = 1.0);
    }
}

// Matriz de 8 pines separados para imprimir juntos comodamente
for (i = [0:3]) {
    for (j = [0:1]) {
        translate([i * 18, j * 12, 2.0])
            rotate([0, -90, 0])
                single_pin();
    }
}
