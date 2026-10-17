// Placas de refuerzo y ensamble trasero (opcionales para maxima rigidez)
// Se pegan con cianoacrilato en la parte trasera de las uniones (invisibles desde el frente)

$fn = 30;

module reinforcement_plate(length = 40, width = 14, thickness = 2.4) {
    difference() {
        hull() {
            translate([-length/2 + width/2, 0, 0]) cylinder(d = width, h = thickness);
            translate([length/2 - width/2, 0, 0]) cylinder(d = width, h = thickness);
        }
        // Ranuras de agarre para pegamento
        for (x = [-length/3, 0, length/3]) {
            translate([x, 0, -0.1]) cylinder(d = 3.5, h = thickness + 0.2);
        }
    }
}

// 4 placas organizadas en cama
for (i = [0:3]) {
    translate([0, i * 20, 0])
        reinforcement_plate();
}
