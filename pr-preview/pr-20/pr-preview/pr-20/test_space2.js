// 1.7cm in px = 1.7 * 80 (since 1cm = 80px on 384x240 @203DPI) = 136px
// Print starts at the top, but we have a non-printable margin (say 1cm = 80px) now at the top
const OFFSET_Y = 80 + 8; // 80px margin + 8px small padding
const nomFontSize = 42;
const nomY = OFFSET_Y;
const prenomFontSize = 32;
const prenomY = nomY + nomFontSize + 2;
const dobFontSize = 24;
const dobY = prenomY + prenomFontSize + 4;
const motifFontSize = 20;
const motifY = dobY + dobFontSize + 4;

console.log("nom", nomY, nomY + nomFontSize);
console.log("prenom", prenomY, prenomY + prenomFontSize);
console.log("dob", dobY, dobY + dobFontSize);
console.log("motif", motifY, motifY + motifFontSize);
console.log("total used height", (motifY + motifFontSize) - OFFSET_Y);
