// Ensamble 3D Completo a escala real (1.20 metros de ancho total)
// COW AI - Wall Sign con relieve 30mm

$fn = 40;

mint_green = [0.55, 0.82, 0.68];
pure_white = [0.96, 0.96, 0.96];

// Posicionamiento de elementos:
// Origen X=0 en la izquierda de la cabeza de vaca

// 1. Cabeza de Vaca (363mm de ancho, 334mm de alto)
translate([181.55, 166.90, 0]) {
    color(mint_green) {
        import("vaca_cuadrante_sup_izq.stl");
        import("vaca_cuadrante_sup_der.stl");
        import("vaca_cuadrante_inf_izq.stl");
        import("vaca_cuadrante_inf_der.stl");
    }
}

// 2. Tipografia COW AI (Altura 182mm)
// Base vertical alineada con el centro del isotipo (Y = 167)
text_y = 167;

// Letra C (Blanco)
translate([363 + 30 + 71, text_y, 0])
    color(pure_white)
        import("letra_C.stl");

// Letra O (Blanco)
translate([363 + 30 + 143 + 20 + 86, text_y, 0])
    color(pure_white)
        import("letra_O.stl");

// Letra W (Blanco)
translate([363 + 30 + 143 + 20 + 172 + 20 + 113, text_y, 0])
    color(pure_white)
        import("letra_W.stl");

// Letra A (Verde menta)
translate([363 + 30 + 143 + 20 + 172 + 20 + 226 + 48 + 86, text_y, 0])
    color(mint_green)
        import("letra_A.stl");

// Letra I (Verde menta)
translate([363 + 30 + 143 + 20 + 172 + 20 + 226 + 48 + 173 + 20 + 17, text_y, 0])
    color(mint_green)
        import("letra_I.stl");

