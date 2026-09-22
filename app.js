/**
 * Application d'impression d'étiquettes thermiques BLE (50x30 mm - 384x240 px)
 * Protocole Tiny Print / GB01 / Cat Printer
 */

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

document.addEventListener('DOMContentLoaded', () => {
    // Canvas & Context
    const canvas = document.getElementById('labelCanvas');
    const ctx = canvas.getContext('2d');

    // Form Inputs
    const inputDiscipline = document.getElementById('inputDiscipline');
    const inputDateEntree = document.getElementById('inputDateEntree');
    const inputNom = document.getElementById('inputNom');
    const inputPrenom = document.getElementById('inputPrenom');
    const inputDateNaissance = document.getElementById('inputDateNaissance');
    const inputMotif = document.getElementById('inputMotif');
    const inputChambreSeule = document.getElementById('inputChambreSeule');
    const btnResetForm = document.getElementById('btnResetForm');

    // Bluetooth UI
    const statusBadge = document.getElementById('bluetoothStatus');
    const btnConnect = document.getElementById('btnConnect');
    const btnDisconnect = document.getElementById('btnDisconnect');
    const btnManualFeed = document.getElementById('btnManualFeed');
    const btnPrintDirect = document.getElementById('btnPrintDirect');
    const btnPrintBatch = document.getElementById('btnPrintBatch');

    // Settings
    const selectProtocol = document.getElementById('printerProtocol');
    const selectThreshold = document.getElementById('printThreshold');
    const selectDensity = document.getElementById('printDensity');
    const inputInterLabelFeed = document.getElementById('interLabelFeed');
    const inputPostPrintFeed = document.getElementById('postPrintFeed');

    // Queue UI
    const btnAddQueue = document.getElementById('btnAddQueue');
    const btnClearQueue = document.getElementById('btnClearQueue');
    const queueListEl = document.getElementById('queueList');
    const queueCountEl = document.getElementById('queueCount');

    // Modal Elements
    const connectionModal = document.getElementById('connectionModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const modalTitle = document.getElementById('modalTitle');
    const radarPulse = document.getElementById('radarPulse');
    const printerMiniatureWrapper = document.getElementById('printerMiniatureWrapper');
    const modalStatusText = document.getElementById('modalStatusText');
    const modalDeviceName = document.getElementById('modalDeviceName');
    const btnModalConnectBle = document.getElementById('btnModalConnectBle');

    // State
    let queue = [];
    let bleDevice = null;
    let bleGattServer = null;
    let bleWriteCharacteristic = null;
    let bleNotifyCharacteristic = null;

    // Liste exhaustive des services BLE utilisés par les imprimantes thermiques (GB01, Lovcoyo X6, WalkPrint, Nordic UART, Phomemo, etc.)
    const BT_SERVICES = [
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
        '49535343-fe7d-4113-a20f-480805411652', // Microchip / ISSC UART Service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Phomemo / iPrint Service
        '0000ff00-0000-1000-8000-00805f9b34fb', // Standard Tiny Print / GB01 0xFF00
        '0000fee7-0000-1000-8000-00805f9b34fb', // GB01 PassThrough 0xFEE7
        '000018f0-0000-1000-8000-00805f9b34fb', // Serial Service 0x18F0
        '000018f1-0000-1000-8000-00805f9b34fb', // Serial Service 0x18F1
        '000018f2-0000-1000-8000-00805f9b34fb', // Serial Service 0x18F2
        '0000ae01-0000-1000-8000-00805f9b34fb', // Lovcoyo X6 / WalkPrint / Fun Print 0xAE01
        '0000ae30-0000-1000-8000-00805f9b34fb', // WalkPrint / X6 variant 0xAE30
        '0000ae00-0000-1000-8000-00805f9b34fb', // Service 0xAE00
        '0000ae02-0000-1000-8000-00805f9b34fb', // Service 0xAE02
        '0000af00-0000-1000-8000-00805f9b34fb', // Service 0xAF00
        '0000af02-0000-1000-8000-00805f9b34fb', // Service 0xAF02
        '0000e725-0000-1000-8000-00805f9b34fb', // Service 0xE725
        '0000ff01-0000-1000-8000-00805f9b34fb', // Service 0xFF01
        '0000ff02-0000-1000-8000-00805f9b34fb', // Service 0xFF02
        '0000ff03-0000-1000-8000-00805f9b34fb', // Service 0xFF03
        '0000ff05-0000-1000-8000-00805f9b34fb', // Service 0xFF05
        '0000ff12-0000-1000-8000-00805f9b34fb', // Service 0xFF12
        '0000ffff-0000-1000-8000-00805f9b34fb', // Service 0xFFFF
        '00001101-0000-1000-8000-00805f9b34fb', // SPP Serial Profile 0x1101
        '0000fee0-0000-1000-8000-00805f9b34fb', // Service 0xFEE0
        '0000fee1-0000-1000-8000-00805f9b34fb', // Service 0xFEE1
        '0000fee2-0000-1000-8000-00805f9b34fb', // Service 0xFEE2
        '0000fef5-0000-1000-8000-00805f9b34fb', // Service 0xFEF5
        '0000abf0-0000-1000-8000-00805f9b34fb', // Service 0xABF0
        '0000cc00-0000-1000-8000-00805f9b34fb', // Service 0xCC00
        '0000cd00-0000-1000-8000-00805f9b34fb', // Service 0xCD00
        '0000de00-0000-1000-8000-00805f9b34fb', // Service 0xDE00
        '0000fe00-0000-1000-8000-00805f9b34fb', // Service 0xFE00
        '0000180a-0000-1000-8000-00805f9b34fb', // Device Information 0x180A
        '00001800-0000-1000-8000-00805f9b34fb', // Generic Access 0x1800
        '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute 0x1801
        // Alias courts (16-bit)
        0x18f0, 0x18f1, 0xae01, 0xae30, 0xff00, 0xfee7, 0xaf00, 0xaf02, 0xe725, 0x180a, 0x1800, 0x1801
    ];

    const BT_CHARACTERISTICS = [
        '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Write
        '0000ff02-0000-1000-8000-00805f9b34fb', // Standard Tiny Print Write
        '0000ff01-0000-1000-8000-00805f9b34fb',
        '0000fee2-0000-1000-8000-00805f9b34fb',
        '0000ae02-0000-1000-8000-00805f9b34fb', // Lovcoyo X6 / WalkPrint Write
        '0000ae01-0000-1000-8000-00805f9b34fb',
        '49535343-8841-43f4-a8d4-ecbe34729bb3',
        '49535343-1e4d-4bd9-ba61-23c647249616',
        '00002ab7-0000-1000-8000-00805f9b34fb'
    ];

    // --- DESSIN DU CANVAS (384 x 240) ---
    function renderCanvas(data = getFormData(), isForPrint = false, targetCtx = ctx, targetCanvas = canvas) {
        targetCtx.save();
        if (isForPrint) {
            targetCtx.translate(targetCanvas.width, targetCanvas.height);
            targetCtx.rotate(Math.PI);
        }

        // Clear canvas with white background
        targetCtx.fillStyle = '#ffffff';
        targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

        targetCtx.fillStyle = '#000000';
        targetCtx.textBaseline = 'top';

        // Décalage vertical global appliqué à tous les éléments.
        // Puisque l'impression subit une rotation de 180°, ce qui est en "bas" du canvas
        // sortira en premier. Pour commencer à imprimer tout de suite sans blanc, le texte
        // doit être collé au bas du canvas (de 88 à 240, ce qui correspond à 1.9cm / 152px de hauteur).
        // Pour l'aperçu, on affiche le texte en haut (OFFSET_Y = 0) et le blanc en bas.
        const OFFSET_Y = isForPrint ? 88 : 0;

        // 1. Discipline (verticale sur le côté gauche, TOUT EN HAUT)
        const disciplineToDraw = data.discipline ? data.discipline : (isForPrint ? "" : "DISC");
        if (disciplineToDraw) {
            targetCtx.save();
            // In preview mode (OFFSET_Y == 0), we must start drawing below our elements.
            // When OFFSET_Y == 88, we start at 88 and draw negative.
            // Since it is vertical text anchored via rotation, if we translate at 0,
            // drawing in negative Y would go offscreen.
            // We need to translate to Y = isForPrint ? 88 : 152.
            const dispY = isForPrint ? 88 : 0;
            targetCtx.translate(22, dispY);
            targetCtx.rotate(-Math.PI / 2);
            targetCtx.font = 'bold 24px Arial, sans-serif';
            // L'axe X pointe vers le haut du canvas. Pour que le texte aille vers le bas (dans le sens de lecture),
            // on doit le dessiner dans les X négatifs et l'aligner à droite pour l'accrocher à l'OFFSET_Y (0 sur X).
            targetCtx.textAlign = 'right';
            targetCtx.fillText(disciplineToDraw, 0, -10);
            targetCtx.restore();
        }

        // 2. Date d'entrée (horizontale, tout en haut à droite)
        const dateEntreeToDraw = data.dateEntree ? data.dateEntree : (isForPrint ? "" : "JJ/MM");
        if (dateEntreeToDraw) {
            targetCtx.save();
            const dateY = isForPrint ? 88 : 0;
            targetCtx.translate(targetCanvas.width - 10, dateY);
            targetCtx.textAlign = 'right';

            // Extract JJ
            const parts = dateEntreeToDraw.split('/');
            const jour = parts[0] || '';
            const mois = getMonthName(dateEntreeToDraw) || (dateEntreeToDraw === "JJ/MM" ? "mmm" : "");

            targetCtx.font = 'bold 36px Arial, sans-serif';
            targetCtx.fillText(jour, 0, 0);

            if (mois) {
                targetCtx.font = 'bold 24px Arial, sans-serif';
                targetCtx.fillText(mois, 0, 36);
            }

            // "Chambre seule" alert icon and text
            if (data.chambreSeule) {
                const iconY = mois ? 64 : 40;

                // Draw Warning Triangle (monochrome)
                targetCtx.beginPath();
                // move to top vertex of triangle
                targetCtx.moveTo(-20, iconY);
                // bottom right
                targetCtx.lineTo(0, iconY + 30);
                // bottom left
                targetCtx.lineTo(-40, iconY + 30);
                targetCtx.closePath();
                targetCtx.fillStyle = '#000000';
                targetCtx.fill();

                // Exclamation mark (white)
                targetCtx.fillStyle = '#ffffff';
                targetCtx.font = 'bold 20px Arial, sans-serif';
                targetCtx.textAlign = 'center';
                targetCtx.fillText('!', -20, iconY + 7); // position Y adjusted for exclamation mark

                // "Ch seule" text
                targetCtx.fillStyle = '#000000';
                targetCtx.textAlign = 'right';
                targetCtx.font = 'bold 18px Arial, sans-serif';
                targetCtx.fillText('Ch seule', 0, iconY + 36);
            }

            targetCtx.restore();
        }

        // Détermination du nombre de lignes pour le motif (police fixe 24px)
        const motifText = data.motif ? data.motif : "Motif d'admission";
        const motifFontSize = 28;
        targetCtx.font = `${motifFontSize}px Arial, sans-serif`;

        let motifLines = [motifText];
        let needsTwoLines = false;

        if (targetCtx.measureText(motifText).width > 280) {
            needsTwoLines = true;
            const words = motifText.split(' ');
            let line1 = '';
            let line2 = '';
            for (let i = 0; i < words.length; i++) {
                const testLine = line1 + (line1 === '' ? '' : ' ') + words[i];
                if (targetCtx.measureText(testLine).width > 280) {
                    if (i === 0) {
                        line1 = testLine;
                        line2 = words.slice(i + 1).join(' ');
                    } else {
                        line2 = words.slice(i).join(' ');
                    }
                    break;
                }
                line1 = testLine;
            }
            motifLines = [line1, line2];
        }

        // Facteur de réduction si le motif est sur 2 lignes
        const baseScale = needsTwoLines ? 0.75 : 1;

        // 3. NOM (au centre, grand/gras) - Tout en haut
        targetCtx.save();
        targetCtx.textAlign = 'center';
        const nomText = data.nom ? data.nom.toUpperCase() : "NOM";
        let nomFontSize = Math.floor(46 * baseScale);
        targetCtx.font = `bold ${nomFontSize}px Arial, sans-serif`;

        // On restreint la largeur pour laisser de la marge pour Discipline et Date
        while (targetCtx.measureText(nomText).width > 280 && nomFontSize > 14) {
            nomFontSize -= 2;
            targetCtx.font = `bold ${nomFontSize}px Arial, sans-serif`;
        }
        const nomY = OFFSET_Y; // Tout en haut
        targetCtx.fillText(nomText, targetCanvas.width / 2, nomY, 280);

        // 4. Prénom (au centre, sous le NOM)
        const prenomText = data.prenom ? data.prenom : "Prénom";
        let prenomFontSize = Math.floor(38 * baseScale);
        targetCtx.font = `${prenomFontSize}px Arial, sans-serif`;

        // On restreint la largeur pour laisser de la marge
        while (targetCtx.measureText(prenomText).width > 280 && prenomFontSize > 14) {
            prenomFontSize -= 2;
            targetCtx.font = `${prenomFontSize}px Arial, sans-serif`;
        }
        const prenomY = nomY + nomFontSize + 2;
        targetCtx.fillText(prenomText, targetCanvas.width / 2, prenomY, 280);

        // 5. Date de naissance (au centre, sous prénom)
        let dobText = data.dateNaissance ? `${data.dateNaissance}` : "JJ/MM/AAAA";
        if (data.dateNaissance && data.dateNaissance.length === 10) {
            const ageStr = calculateAge(data.dateNaissance);
            if (ageStr) {
                dobText += ` (${ageStr})`;
            }
        }
        const dobFontSize = Math.floor(27 * baseScale);
        targetCtx.font = `${dobFontSize}px Arial, sans-serif`;
        const dobY = prenomY + prenomFontSize + 2;
        targetCtx.fillText(dobText, targetCanvas.width / 2, dobY);

        // 6. Motif d'admission (en bas au centre)
        targetCtx.font = `${motifFontSize}px Arial, sans-serif`;
        const motifY = dobY + dobFontSize + 4;

        if (motifLines.length === 1) {
            targetCtx.fillText(motifLines[0], targetCanvas.width / 2, motifY, 280);
        } else {
            targetCtx.fillText(motifLines[0], targetCanvas.width / 2, motifY, 280);
            targetCtx.fillText(motifLines[1], targetCanvas.width / 2, motifY + motifFontSize + 2, 280);
        }

        if (!isForPrint) {
            targetCtx.save();
            targetCtx.setLineDash([5, 5]);
            targetCtx.beginPath();
            // Ligne indiquant la limite basse (marge de 88px en bas de l'aperçu, donc Y=152)
            targetCtx.moveTo(0, 152);
            targetCtx.lineTo(targetCanvas.width, 152);
            targetCtx.strokeStyle = '#999999';
            targetCtx.lineWidth = 2;
            targetCtx.stroke();
            targetCtx.restore();
        }

        targetCtx.restore();
        targetCtx.restore();
    }

    function getFormData() {
        return {
            discipline: inputDiscipline.value.trim(),
            dateEntree: inputDateEntree.value.trim(),
            nom: inputNom.value.trim(),
            prenom: inputPrenom.value.trim(),
            dateNaissance: inputDateNaissance.value.trim(),
            motif: inputMotif.value.trim(),
            chambreSeule: inputChambreSeule.checked
        };
    }


    function calculateAge(dateStr) {
        if (!dateStr || dateStr.length !== 10) return "";
        const parts = dateStr.split('/');
        if (parts.length !== 3) return "";

        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        if (isNaN(day) || isNaN(month) || isNaN(year)) return "";

const now = new Date();
const dob = new Date(year, month, day);
if (dob.getFullYear() !== year || dob.getMonth() !== month || dob.getDate() !== day) return "";
if (dob > now) return "";
        let age = now.getFullYear() - dob.getFullYear();
        let m = now.getMonth() - dob.getMonth();

        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
            age--;
        }

        if (age < 0 || age > 150) return "";

        if (age === 0) {
            if (m < 0) m += 12;
            if (now.getDate() < dob.getDate()) {
                m--;
                if (m < 0) m += 12;
            }
            if (m === 0) {
const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
const utcDob = Date.UTC(dob.getFullYear(), dob.getMonth(), dob.getDate());
const days = Math.floor((utcNow - utcDob) / (1000 * 3600 * 24));
            }
            return `${m} mois`;
        }

        return `${age} an${age > 1 ? 's' : ''}`;
    }

    function getMonthName(dateStr) {
        if (!dateStr) return "";
        const parts = dateStr.split('/');
        if (parts.length >= 2) {
            const month = parts[1];
            const months = {
                '01': 'jan', '02': 'fev', '03': 'mar', '04': 'avr',
                '05': 'mai', '06': 'jun', '07': 'jul', '08': 'aou',
                '09': 'sep', '10': 'oct', '11': 'nov', '12': 'dec'
            };
            return months[month] || "";
        }
        return "";
    }

    // Fonction utilitaire pour formater la date en JJ/MM ou JJ/MM/AAAA
    function formatDateInput(input, withYear = false) {
        let value = input.value.replace(/\D/g, ''); // Garder que les chiffres
        if (value.length > 2) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        if (withYear && value.length > 5) {
            value = value.substring(0, 5) + '/' + value.substring(5, 9);
        }
        if (!withYear && value.length > 5) {
            value = value.substring(0, 5); // Limiter à JJ/MM
        }
        input.value = value;
    }

    // Formatage automatique à la saisie
    inputDiscipline.addEventListener('input', () => {
        let val = inputDiscipline.value.toUpperCase();
        if (val.length > 4) val = val.substring(0, 4);
        inputDiscipline.value = val;
    });

    inputDateEntree.addEventListener('input', () => {
        formatDateInput(inputDateEntree, false);
    });

    inputDateNaissance.addEventListener('input', () => {
        formatDateInput(inputDateNaissance, true);
    });

    inputNom.addEventListener('input', () => {
        inputNom.value = inputNom.value.toUpperCase();
    });

    inputPrenom.addEventListener('input', () => {
        // Met en majuscule la première lettre de chaque mot/partie, en gérant les espaces et tirets
        inputPrenom.value = inputPrenom.value.replace(/(^|[\s-])\S/g, function(match) {
            return match.toUpperCase();
        });
    });

    // Écouteurs de formulaire pour rendu temps réel
    [inputDiscipline, inputDateEntree, inputNom, inputPrenom, inputDateNaissance, inputMotif].forEach(input => {
        input.addEventListener('input', () => renderCanvas());
    });
    inputChambreSeule.addEventListener('change', () => renderCanvas());

    btnResetForm.addEventListener('click', () => {
        inputDiscipline.value = '';
        inputDateEntree.value = '';
        inputNom.value = '';
        inputPrenom.value = '';
        inputDateNaissance.value = '';
        inputMotif.value = '';
        inputChambreSeule.checked = false;
        renderCanvas();
    });

    /* ============================================================
     *  ÉTIQUETTE EN SAISIE LIBRE
     *  Même format (50 × 30 mm / 384 × 240 px) que l'étiquette standard
     *  mais : saisie libre, placement libre (glisser-déposer ou X/Y),
     *  mise en forme libre (police, taille, style, rotation, inversion,
     *  encadrement, interligne, espacement) et options d'étiquette
     *  (cadre, zone imprimable, repères, magnétisme, modèles).
     *
     *  Convention d'impression : identique à l'étiquette standard.
     *  L'imprimante consomme d'abord l'avance papier (88 px = 11 mm) puis
     *  reçoit la zone imprimable (152 px = 19 mm). Le rendu papier applique
     *  donc la rotation 180° et un décalage vertical de `options.offset`.
     * ============================================================ */

    const FREE_W = 384;
    const FREE_H = 240;
    const FREE_MODEL_KEY = 'tinyprint.etiquette-libre.v1';
    const FREE_TEMPLATES_KEY = 'tinyprint.etiquette-libre.modeles.v1';

    const FREE_FONTS = [
        { value: 'Arial, sans-serif', label: 'Arial (bâton)' },
        { value: 'Verdana, sans-serif', label: 'Verdana' },
        { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet MS' },
        { value: '"Courier New", monospace', label: 'Courier (machine)' },
        { value: '"Times New Roman", serif', label: 'Times (serif)' },
        { value: 'Georgia, serif', label: 'Georgia' },
        { value: 'Impact, sans-serif', label: 'Impact (très large)' }
    ];

    // Modèles prêts à l'emploi (mêmes possibilités que la saisie manuelle)
    const FREE_BUILTIN_TEMPLATES = {
        'Deux lignes centrées': [
            { text: 'TITRE', x: 192, y: 18, size: 42, bold: true, align: 'center' },
            { text: 'Sous-titre', x: 192, y: 70, size: 26, align: 'center' }
        ],
        'Trois lignes + trait': [
            { text: 'SERVICE', x: 192, y: 8, size: 22, bold: true, align: 'center' },
            { type: 'line', x: 40, y: 34, width: 304, thickness: 3 },
            { text: 'Ligne 1', x: 192, y: 44, size: 32, bold: true, align: 'center' },
            { text: 'Ligne 2', x: 192, y: 84, size: 26, align: 'center' },
            { text: 'Ligne 3', x: 192, y: 118, size: 22, align: 'center' }
        ],
        'Bandeau inversé': [
            { text: 'INFORMATION', x: 192, y: 6, size: 30, bold: true, align: 'center', invert: true },
            { text: 'Texte libre', x: 192, y: 52, size: 26, align: 'center' },
            { text: 'complément', x: 192, y: 88, size: 22, align: 'center' }
        ],
        'Étiquette patient (type standard)': [
            { text: 'DISC', x: 12, y: 0, size: 24, bold: true, rotate: 270, align: 'right' },
            { text: 'JJ', x: 374, y: 0, size: 36, bold: true, align: 'right' },
            { text: 'MMM', x: 374, y: 34, size: 24, bold: true, align: 'right' },
            { text: 'NOM', x: 192, y: 0, size: 46, bold: true, align: 'center' },
            { text: 'Prénom', x: 192, y: 48, size: 38, align: 'center' },
            { text: 'JJ/MM/AAAA', x: 192, y: 88, size: 27, align: 'center' },
            { text: "Motif d'admission", x: 192, y: 119, size: 24, align: 'center', maxWidth: 280 }
        ],
        'Mention + cadre': [
            { text: 'À CONSERVER', x: 192, y: 26, size: 40, bold: true, align: 'center' },
            { text: 'Pochette / Dossier', x: 192, y: 80, size: 26, align: 'center' }
        ]
    };

    // --- Références DOM ---
    const freeModal = document.getElementById('freeModal');
    const btnOpenFree = document.getElementById('btnOpenFree');
    const btnCloseFreeModal = document.getElementById('btnCloseFreeModal');
    const freeCanvas = document.getElementById('freeCanvas');
    const freeCtx = freeCanvas.getContext('2d');
    const freeLayersEl = document.getElementById('freeLayers');
    const freeLayerCountEl = document.getElementById('freeLayerCount');
    const freeEditorEl = document.getElementById('freeEditor');
    const freeEditorEmptyEl = document.getElementById('freeEditorEmpty');
    const freeWarningEl = document.getElementById('freeWarning');
    const freeLineOptionsEl = document.getElementById('freeLineOptions');
    const freeTextEl = document.getElementById('freeText');
    const freeFontEl = document.getElementById('freeFont');
    const freeSizeEl = document.getElementById('freeSize');
    const freeSizeNumEl = document.getElementById('freeSizeNum');
    const freeBoldEl = document.getElementById('freeBold');
    const freeItalicEl = document.getElementById('freeItalic');
    const freeUnderlineEl = document.getElementById('freeUnderline');
    const freeInvertEl = document.getElementById('freeInvert');
    const freeLineHeightEl = document.getElementById('freeLineHeight');
    const freeSpacingEl = document.getElementById('freeSpacing');
    const freeMaxWidthEl = document.getElementById('freeMaxWidth');
    const freeBoxEl = document.getElementById('freeBox');
    const freePosXEl = document.getElementById('freePosX');
    const freePosYEl = document.getElementById('freePosY');
    const freeLineWidthEl = document.getElementById('freeLineWidth');
    const freeLineThicknessEl = document.getElementById('freeLineThickness');
    const freeBorderEl = document.getElementById('freeBorder');
    const freeBorderWidthEl = document.getElementById('freeBorderWidth');
    const freeMarginEl = document.getElementById('freeMargin');
    const freeGridEl = document.getElementById('freeGrid');
    const freeOffsetEl = document.getElementById('freeOffset');
    const freeGuidesEl = document.getElementById('freeGuides');
    const freeTemplateSelectEl = document.getElementById('freeTemplateSelect');
    const btnFreeAddText = document.getElementById('btnFreeAddText');
    const btnFreeAddLine = document.getElementById('btnFreeAddLine');
    const btnFreeDuplicate = document.getElementById('btnFreeDuplicate');
    const btnFreeFromForm = document.getElementById('btnFreeFromForm');
    const btnFreeReset = document.getElementById('btnFreeReset');
    const btnFreeSaveTemplate = document.getElementById('btnFreeSaveTemplate');
    const btnFreeDeleteTemplate = document.getElementById('btnFreeDeleteTemplate');
    const btnFreeAddQueue = document.getElementById('btnFreeAddQueue');
    const btnFreePrint = document.getElementById('btnFreePrint');

    let freeSeq = 1;
    let freeSel = null;
    let freeDrag = null;
    let freeModel = null;

    // Contexte hors écran utilisé pour mesurer le texte (police, retour à la ligne…)
    const freeMeasureCanvas = document.createElement('canvas');
    freeMeasureCanvas.width = FREE_W;
    freeMeasureCanvas.height = FREE_H;
    const freeMeasureCtx = freeMeasureCanvas.getContext('2d');

    function freeNewModel() {
        return {
            version: 1,
            options: { offset: 88, guides: true, grid: 4, border: 'none', borderWidth: 3, margin: 6 },
            elements: []
        };
    }

    function freeMakeElement(props = {}) {
        const el = {
            id: freeSeq++,
            type: props.type === 'line' ? 'line' : 'text',
            text: typeof props.text === 'string' ? props.text : '',
            x: Number.isFinite(props.x) ? props.x : 192,
            y: Number.isFinite(props.y) ? props.y : 20,
            size: Number.isFinite(props.size) ? props.size : 26,
            font: props.font || 'Arial, sans-serif',
            bold: !!props.bold,
            italic: !!props.italic,
            underline: !!props.underline,
            align: props.align === 'left' || props.align === 'right' ? props.align : 'center',
            rotate: Number.isFinite(props.rotate) ? props.rotate : 0,
            invert: !!props.invert,
            lineHeight: Number.isFinite(props.lineHeight) ? props.lineHeight : 1.1,
            maxWidth: Number.isFinite(props.maxWidth) ? props.maxWidth : 0,
            spacing: Number.isFinite(props.spacing) ? props.spacing : 0,
            box: props.box || 'none',
            hidden: !!props.hidden,
            width: Number.isFinite(props.width) ? props.width : 200,
            thickness: Number.isFinite(props.thickness) ? props.thickness : 3
        };
        return el;
    }

    function freeElementsFromPreset(liste) {
        return liste.map((props) => freeMakeElement(props));
    }

    function freeDeepCopy(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function freeClamp(valeur, min, max) {
        return Math.min(max, Math.max(min, valeur));
    }

    // --- MOTEUR DE RENDU ---

    function freeSetFont(targetCtx, el) {
        targetCtx.font = `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${el.size}px ${el.font}`;
        // Espacement des lettres (ignoré silencieusement par les navigateurs qui ne le gèrent pas)
        try { targetCtx.letterSpacing = `${Number(el.spacing) || 0}px`; } catch (e) { /* non supporté */ }
    }

    function freeWrapLines(targetCtx, texte, maxWidth) {
        const paragraphes = String(texte == null ? '' : texte).split('\n');
        if (!maxWidth || maxWidth <= 0) return paragraphes;
        const lignes = [];
        paragraphes.forEach((paragraphe) => {
            const mots = paragraphe.split(/\s+/).filter((m) => m !== '');
            if (mots.length === 0) { lignes.push(''); return; }
            let courante = '';
            mots.forEach((mot) => {
                const essai = courante ? courante + ' ' + mot : mot;
                if (courante && targetCtx.measureText(essai).width > maxWidth) {
                    lignes.push(courante);
                    courante = mot;
                } else {
                    courante = essai;
                }
            });
            lignes.push(courante);
        });
        return lignes;
    }

    // Boîte de l'élément dans son propre repère (avant translation / rotation)
    // ignorePad : n'inclut pas la marge décorative (fond inversé / cadre) — utile
    // pour distinguer le contenu réel des éléments sans habillage.
    function freeLocalBox(targetCtx, el, ignorePad = false) {
        if (el.type === 'line') {
            const epaisseur = Math.max(1, Number(el.thickness) || 1);
            const largeur = Math.max(1, Number(el.width) || 1);
            return { x0: 0, y0: -epaisseur / 2, x1: largeur, y1: epaisseur / 2, pad: 0, lines: [], lineHeight: 0 };
        }
        freeSetFont(targetCtx, el);
        const lignes = freeWrapLines(targetCtx, el.text, Number(el.maxWidth) || 0);
        let largeur = 0;
        lignes.forEach((ligne) => { largeur = Math.max(largeur, targetCtx.measureText(ligne).width); });
        const interligne = el.size * (Number(el.lineHeight) || 1.1);
        const hauteur = (lignes.length - 1) * interligne + el.size;
        const pad = ignorePad ? 0 : (el.invert || el.box === 'rect' ? Math.max(2, Math.round(el.size * 0.16)) : 2);
        const dx = el.align === 'center' ? -largeur / 2 : (el.align === 'right' ? -largeur : 0);
        return { x0: dx - pad, y0: -pad, x1: dx + largeur + pad, y1: hauteur + pad, pad: pad, lines: lignes, lineHeight: interligne, largeur: largeur, hauteur: hauteur };
    }

    function freeElementBBox(targetCtx, el, ignorePad = false) {
        const boite = freeLocalBox(targetCtx, el, ignorePad);
        const angle = (el.rotate || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const coins = [[boite.x0, boite.y0], [boite.x1, boite.y0], [boite.x1, boite.y1], [boite.x0, boite.y1]];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        coins.forEach(([px, py]) => {
            const x = el.x + px * cos - py * sin;
            const y = el.y + px * sin + py * cos;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        });
        return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
    }

    function freeHitTest(targetCtx, px, py) {
        for (let i = freeModel.elements.length - 1; i >= 0; i--) {
            const el = freeModel.elements[i];
            if (el.hidden) continue;
            const angle = -(el.rotate || 0) * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const dx = px - el.x;
            const dy = py - el.y;
            const lx = dx * cos - dy * sin;
            const ly = dx * sin + dy * cos;
            const boite = freeLocalBox(targetCtx, el);
            const marge = 3;
            if (lx >= boite.x0 - marge && lx <= boite.x1 + marge && ly >= boite.y0 - marge && ly <= boite.y1 + marge) return el;
        }
        return null;
    }

    function freeDrawElement(targetCtx, el, offsetY) {
        if (el.hidden) return;
        const boite = freeLocalBox(targetCtx, el);

        targetCtx.save();
        targetCtx.translate(el.x, el.y + offsetY);
        if (el.rotate) targetCtx.rotate(el.rotate * Math.PI / 180);

        if (el.type === 'line') {
            const epaisseur = Math.max(1, Number(el.thickness) || 1);
            const largeur = Math.max(1, Number(el.width) || 1);
            targetCtx.fillStyle = '#000000';
            targetCtx.fillRect(0, -epaisseur / 2, largeur, epaisseur);
            targetCtx.restore();
            return;
        }

        freeSetFont(targetCtx, el);
        targetCtx.textAlign = el.align;
        targetCtx.textBaseline = 'top';

        // Aplat inversé (texte blanc sur fond noir)
        if (el.invert) {
            targetCtx.fillStyle = '#000000';
            targetCtx.fillRect(boite.x0, boite.y0, boite.x1 - boite.x0, boite.y1 - boite.y0);
        }

        // Cadre autour de l'élément
        if (el.box === 'rect') {
            targetCtx.strokeStyle = el.invert ? '#ffffff' : '#000000';
            targetCtx.lineWidth = 2;
            targetCtx.strokeRect(boite.x0, boite.y0, boite.x1 - boite.x0, boite.y1 - boite.y0);
        }

        targetCtx.fillStyle = el.invert ? '#ffffff' : '#000000';
        boite.lines.forEach((ligne, index) => {
            const ly = index * boite.lineHeight;
            if (ligne !== '') targetCtx.fillText(ligne, 0, ly);
            if (el.underline && ligne !== '') {
                const largeurTexte = targetCtx.measureText(ligne).width;
                const ux = el.align === 'center' ? -largeurTexte / 2 : (el.align === 'right' ? -largeurTexte : 0);
                targetCtx.fillRect(ux, ly + el.size * 0.94, largeurTexte, Math.max(1, Math.round(el.size / 14)));
            }
        });

        if (el.box === 'below' || el.box === 'top') {
            const epaisseur = Math.max(1, Math.round(el.size / 12));
            const yTrait = el.box === 'below' ? boite.y1 - boite.pad / 2 : boite.y0 + boite.pad / 2 - epaisseur;
            targetCtx.fillRect(boite.x0 + boite.pad, yTrait, boite.x1 - boite.x0 - 2 * boite.pad, epaisseur);
        }

        targetCtx.restore();
    }

    function freeRoundRectPath(targetCtx, x, y, w, h, r) {
        const rayon = Math.min(r, w / 2, h / 2);
        targetCtx.beginPath();
        if (typeof targetCtx.roundRect === 'function') {
            targetCtx.roundRect(x, y, w, h, rayon);
            return;
        }
        targetCtx.moveTo(x + rayon, y);
        targetCtx.lineTo(x + w - rayon, y);
        targetCtx.quadraticCurveTo(x + w, y, x + w, y + rayon);
        targetCtx.lineTo(x + w, y + h - rayon);
        targetCtx.quadraticCurveTo(x + w, y + h, x + w - rayon, y + h);
        targetCtx.lineTo(x + rayon, y + h);
        targetCtx.quadraticCurveTo(x, y + h, x, y + h - rayon);
        targetCtx.lineTo(x, y + rayon);
        targetCtx.quadraticCurveTo(x, y, x + rayon, y);
        targetCtx.closePath();
    }

    // Cadre dessiné autour de la zone imprimable (dans le repère de conception)
    function freeDrawBorder(targetCtx, model, offsetY) {
        const style = model.options.border;
        if (!style || style === 'none') return;

        const marge = Math.max(0, Number(model.options.margin) || 0);
        const epaisseur = Math.max(1, Number(model.options.borderWidth) || 3);
        const zone = FREE_H - (Number(model.options.offset) || 0);
        const x = marge;
        const y = marge + offsetY;
        const w = FREE_W - 2 * marge;
        const h = zone - 2 * marge;
        if (w <= 0 || h <= 0) return;

        targetCtx.save();
        targetCtx.fillStyle = '#000000';
        targetCtx.strokeStyle = '#000000';

        if (style === 'rounded') {
            targetCtx.lineWidth = epaisseur;
            freeRoundRectPath(targetCtx, x, y, w, h, Math.min(16, h / 3));
            targetCtx.stroke();
        } else if (style === 'double') {
            targetCtx.lineWidth = epaisseur;
            targetCtx.strokeRect(x, y, w, h);
            const inset = epaisseur + 2;
            targetCtx.strokeRect(x + inset, y + inset, w - 2 * inset, h - 2 * inset);
        } else {
            targetCtx.lineWidth = style === 'thick' ? epaisseur * 2 : epaisseur;
            targetCtx.strokeRect(x, y, w, h);
        }
        targetCtx.restore();
    }

    function renderFreeCanvas(model, isForPrint, targetCtx, targetCanvas) {
        const W = targetCanvas.width;
        const H = targetCanvas.height;

        targetCtx.save();
        targetCtx.fillStyle = '#ffffff';
        targetCtx.fillRect(0, 0, W, H);

        // Repère papier : rotation 180° imposée par l'imprimante thermique
        const offsetY = isForPrint ? (Number(model.options.offset) || 0) : 0;
        if (isForPrint) {
            targetCtx.translate(W, H);
            targetCtx.rotate(Math.PI);
        }

        freeDrawBorder(targetCtx, model, offsetY);
        model.elements.forEach((el) => freeDrawElement(targetCtx, el, offsetY));

        targetCtx.restore();
    }

    // --- APERÇU ÉCRAN (repères + sélection) ---

    function freeUsableHeight() {
        return FREE_H - (Number(freeModel.options.offset) || 0);
    }

    function freeDrawGuides(targetCtx) {
        const zone = freeUsableHeight();
        targetCtx.save();

        // Bande consommée par l'avance papier de l'imprimante
        if (zone < FREE_H) {
            targetCtx.fillStyle = 'rgba(148, 163, 184, 0.18)';
            targetCtx.fillRect(0, zone, FREE_W, FREE_H - zone);
            targetCtx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
            targetCtx.lineWidth = 1;
            for (let x = -FREE_H; x < FREE_W; x += 9) {
                targetCtx.beginPath();
                targetCtx.moveTo(x, FREE_H);
                targetCtx.lineTo(x + (FREE_H - zone), zone);
                targetCtx.stroke();
            }
        }

        // Grille de magnétisme
        const pas = Number(freeModel.options.grid) || 0;
        if (pas > 0) {
            targetCtx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
            targetCtx.lineWidth = 1;
            for (let x = 0; x <= FREE_W; x += pas * 6) {
                targetCtx.beginPath(); targetCtx.moveTo(x + 0.5, 0); targetCtx.lineTo(x + 0.5, Math.min(zone, FREE_H)); targetCtx.stroke();
            }
            for (let y = 0; y <= zone; y += pas * 6) {
                targetCtx.beginPath(); targetCtx.moveTo(0, y + 0.5); targetCtx.lineTo(FREE_W, y + 0.5); targetCtx.stroke();
            }
        }

        // Limite de la zone imprimable
        targetCtx.setLineDash([6, 4]);
        targetCtx.strokeStyle = '#e11d48';
        targetCtx.lineWidth = 2;
        targetCtx.beginPath();
        targetCtx.moveTo(0, zone);
        targetCtx.lineTo(FREE_W, zone);
        targetCtx.stroke();
        targetCtx.setLineDash([]);

        // Axe central
        targetCtx.strokeStyle = 'rgba(37, 99, 235, 0.25)';
        targetCtx.setLineDash([2, 6]);
        targetCtx.beginPath();
        targetCtx.moveTo(FREE_W / 2, 0);
        targetCtx.lineTo(FREE_W / 2, zone);
        targetCtx.stroke();
        targetCtx.setLineDash([]);

        targetCtx.restore();
    }

    function updateFreeWarning() {
        const zone = freeUsableHeight();
        const hauteurMm = Math.round(zone * 30 / FREE_H);
        let horsZone = 0;
        let horsLargeur = 0;
        freeModel.elements.forEach((el) => {
            if (el.hidden) return;
            // La marge décorative n'est comptée que si elle est réellement dessinée
            // (fond inversé ou cadre), sinon un texte collé à y = 0 déclencherait
            // une alerte injustifiée.
            const habille = el.type === 'text' && (el.invert || el.box === 'rect');
            const boite = freeElementBBox(freeMeasureCtx, el, !habille);
            if (boite.maxY > zone + 0.5 || boite.minY < -0.5) horsZone++;
            if (boite.minX < -0.5 || boite.maxX > FREE_W + 0.5) horsLargeur++;
        });

        const messages = [];
        if (horsZone) messages.push(`${horsZone} élément(s) sortent de la zone imprimable (${hauteurMm} mm) : la partie basse ne sera pas imprimée.`);
        if (horsLargeur) messages.push(`${horsLargeur} élément(s) dépassent la largeur de l'étiquette (384 px) : ils seront coupés.`);

        if (messages.length) {
            freeWarningEl.textContent = '⚠ ' + messages.join(' ');
            freeWarningEl.classList.remove('hidden');
        } else {
            freeWarningEl.textContent = '';
            freeWarningEl.classList.add('hidden');
        }
    }

    function renderFreePreview() {
        if (!freeModel) return;
        renderFreeCanvas(freeModel, false, freeCtx, freeCanvas);

        if (freeModel.options.guides) freeDrawGuides(freeCtx);

        const el = freeSelected();
        if (el) {
            const boite = freeElementBBox(freeMeasureCtx, el);
            freeCtx.save();
            freeCtx.setLineDash([5, 3]);
            freeCtx.strokeStyle = '#2563eb';
            freeCtx.lineWidth = 1.5;
            freeCtx.strokeRect(
                Math.round(boite.minX) - 2,
                Math.round(boite.minY) - 2,
                Math.round(boite.maxX - boite.minX) + 4,
                Math.round(boite.maxY - boite.minY) + 4
            );
            freeCtx.setLineDash([]);
            freeCtx.restore();
        }

        updateFreeWarning();
    }

    // --- CALQUES ---

    function freeSelected() {
        if (!freeModel) return null;
        return freeModel.elements.find((el) => el.id === freeSel) || null;
    }

    function freeLayerLabel(el, index) {
        if (el.type === 'line') return `Trait ${Math.round(el.width)} px`;
        const texte = String(el.text || '').replace(/\s+/g, ' ').trim();
        if (!texte) return `Texte vide ${index + 1}`;
        return texte.length > 22 ? texte.slice(0, 22) + '…' : texte;
    }

    function renderFreeLayers() {
        freeLayersEl.innerHTML = '';
        freeLayerCountEl.textContent = String(freeModel.elements.length);

        if (freeModel.elements.length === 0) {
            const vide = document.createElement('li');
            vide.className = 'free-empty';
            vide.textContent = 'Aucun élément. Ajoutez du texte ou un trait.';
            freeLayersEl.appendChild(vide);
            return;
        }

        // Affichage du dessus de pile vers le bas
        const ordre = freeModel.elements.slice().reverse();
        ordre.forEach((el, i) => {
            const indexReel = freeModel.elements.length - 1 - i;
            const li = document.createElement('li');
            li.className = 'layer-item' + (el.id === freeSel ? ' selected' : '');
            li.dataset.id = String(el.id);
            li.title = el.hidden ? 'Élément masqué' : 'Cliquer pour sélectionner';
            li.innerHTML = `
                <span class="layer-label ${el.hidden ? 'layer-hidden' : ''}">${el.type === 'line' ? '— ' : ''}${freeEscape(freeLayerLabel(el, indexReel))}</span>
                <button type="button" class="layer-icon-btn" data-action="up" aria-label="Monter l'élément dans la pile" title="Monter">▲</button>
                <button type="button" class="layer-icon-btn" data-action="down" aria-label="Descendre l'élément dans la pile" title="Descendre">▼</button>
                <button type="button" class="layer-icon-btn" data-action="dup" aria-label="Dupliquer l'élément" title="Dupliquer">⧉</button>
                <button type="button" class="layer-icon-btn" data-action="eye" aria-label="Afficher ou masquer l'élément" title="Afficher / masquer">${el.hidden ? '🚫' : '👁'}</button>
                <button type="button" class="layer-icon-btn danger" data-action="del" aria-label="Supprimer l'élément" title="Supprimer">✕</button>
            `;
            freeLayersEl.appendChild(li);
        });
    }

    function freeEscape(texte) {
        return String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function freeReorder(id, sens) {
        const index = freeModel.elements.findIndex((el) => el.id === id);
        const cible = index + sens;
        if (index < 0 || cible < 0 || cible >= freeModel.elements.length) return;
        const [el] = freeModel.elements.splice(index, 1);
        freeModel.elements.splice(cible, 0, el);
        freeLayersRefresh();
    }

    function freeDuplicate(id) {
        const index = freeModel.elements.findIndex((el) => el.id === id);
        if (index < 0) return;
        const copie = freeDeepCopy(freeModel.elements[index]);
        copie.id = freeSeq++;
        copie.x = freeClamp(copie.x + 6, -40, FREE_W + 40);
        copie.y = freeClamp(copie.y + 6, -40, FREE_H + 20);
        freeModel.elements.splice(index + 1, 0, copie);
        freeSel = copie.id;
        freeLayersRefresh();
    }

    function freeDelete(id) {
        freeModel.elements = freeModel.elements.filter((el) => el.id !== id);
        if (freeSel === id) freeSel = null;
        freeLayersRefresh();
    }

    function freeToggleHidden(id) {
        const el = freeModel.elements.find((e) => e.id === id);
        if (!el) return;
        el.hidden = !el.hidden;
        freeLayersRefresh();
    }

    function freeLayersRefresh() {
        renderFreeLayers();
        syncFreeEditor();
        renderFreePreview();
        freeSave();
    }

    function freeSelect(id) {
        freeSel = id;
        renderFreeLayers();
        syncFreeEditor();
        renderFreePreview();
    }

    // --- ÉDITEUR DE MISE EN FORME ---

    function freeSetIfIdle(input, valeur) {
        if (document.activeElement === input) return;
        input.value = valeur;
    }

    function syncFreeEditor() {
        const el = freeSelected();
        freeEditorEl.classList.toggle('hidden', !el);
        freeEditorEmptyEl.classList.toggle('hidden', !!el);
        if (!el) return;

        const estTrait = el.type === 'line';
        freeEditorEl.classList.toggle('mode-line', estTrait);
        freeLineOptionsEl.classList.toggle('hidden', !estTrait);

        if (!estTrait) {
            freeSetIfIdle(freeTextEl, el.text);
            freeSetIfIdle(freeFontEl, el.font);
            freeSetIfIdle(freeSizeEl, String(el.size));
            freeSetIfIdle(freeSizeNumEl, String(el.size));
            freeSetIfIdle(freeLineHeightEl, String(el.lineHeight));
            freeSetIfIdle(freeSpacingEl, String(el.spacing));
            freeSetIfIdle(freeMaxWidthEl, String(el.maxWidth));
            freeSetIfIdle(freeBoxEl, el.box);
        }

        freeSetIfIdle(freePosXEl, String(Math.round(el.x)));
        freeSetIfIdle(freePosYEl, String(Math.round(el.y)));
        freeBoldEl.classList.toggle('active', !!el.bold);
        freeItalicEl.classList.toggle('active', !!el.italic);
        freeUnderlineEl.classList.toggle('active', !!el.underline);
        freeInvertEl.classList.toggle('active', !!el.invert);

        freeModal.querySelectorAll('[data-align]').forEach((btn) => {
            btn.classList.toggle('active', String(btn.dataset.align) === String(el.align));
        });
        freeModal.querySelectorAll('[data-rotate]').forEach((btn) => {
            btn.classList.toggle('active', Number(btn.dataset.rotate) === el.rotate);
        });

        if (estTrait) {
            freeSetIfIdle(freeLineWidthEl, String(el.width));
            freeSetIfIdle(freeLineThicknessEl, String(el.thickness));
        }
    }

    function freeUpdate(patch, options = {}) {
        const el = freeSelected();
        if (!el) return;
        Object.assign(el, patch);
        if (!options.skipEditor) syncFreeEditor();
        if (options.skipLayers) {
            const label = freeLayersEl.querySelector('.layer-item.selected .layer-label');
            if (label) label.textContent = (el.type === 'line' ? '— ' : '') + freeLayerLabel(el, 0);
        } else {
            renderFreeLayers();
        }
        renderFreePreview();
        freeSave();
    }

    function syncFreeOptionsFromUI() {
        freeModel.options.offset = Number(freeOffsetEl.value) || 0;
        freeModel.options.guides = freeGuidesEl.checked;
        freeModel.options.grid = Number(freeGridEl.value) || 0;
        freeModel.options.border = freeBorderEl.value;
        freeModel.options.borderWidth = freeClamp(Number(freeBorderWidthEl.value) || 3, 1, 12);
        freeModel.options.margin = freeClamp(Number(freeMarginEl.value) || 0, 0, 40);
        renderFreePreview();
        freeSave();
    }

    function syncFreeOptionsToUI() {
        freeOffsetEl.value = String(freeModel.options.offset);
        freeGuidesEl.checked = !!freeModel.options.guides;
        freeGridEl.value = String(freeModel.options.grid);
        freeBorderEl.value = freeModel.options.border;
        freeBorderWidthEl.value = String(freeModel.options.borderWidth);
        freeMarginEl.value = String(freeModel.options.margin);
    }

    // --- PERSISTANCE & MODÈLES ---

    function freeSave() {
        try {
            localStorage.setItem(FREE_MODEL_KEY, JSON.stringify({ options: freeModel.options, elements: freeModel.elements }));
        } catch (e) { /* stockage indisponible */ }
    }

    function freeLoad() {
        try {
            const brut = localStorage.getItem(FREE_MODEL_KEY);
            if (!brut) return null;
            const donnees = JSON.parse(brut);
            const model = freeNewModel();
            if (donnees && donnees.options) Object.assign(model.options, donnees.options);
            if (donnees && Array.isArray(donnees.elements)) {
                model.elements = donnees.elements.map((el) => freeMakeElement(el));
            }
            return model;
        } catch (e) {
            return null;
        }
    }

    function freeLoadTemplates() {
        try {
            return JSON.parse(localStorage.getItem(FREE_TEMPLATES_KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    function freeWriteTemplates(modeles) {
        try {
            localStorage.setItem(FREE_TEMPLATES_KEY, JSON.stringify(modeles));
        } catch (e) { /* stockage indisponible */ }
    }

    function freeFillTemplateSelect() {
        const perso = freeLoadTemplates();
        const valeur = freeTemplateSelectEl.value;
        freeTemplateSelectEl.innerHTML = '<option value="">Modèles…</option>';

        const groupePrests = document.createElement('optgroup');
        groupePrests.label = 'Modèles prêts';
        Object.keys(FREE_BUILTIN_TEMPLATES).forEach((nom) => {
            const option = document.createElement('option');
            option.value = 'builtin:' + nom;
            option.textContent = nom;
            groupePrests.appendChild(option);
        });
        freeTemplateSelectEl.appendChild(groupePrests);

        const noms = Object.keys(perso);
        if (noms.length) {
            const groupePerso = document.createElement('optgroup');
            groupePerso.label = 'Mes modèles';
            noms.forEach((nom) => {
                const option = document.createElement('option');
                option.value = 'perso:' + nom;
                option.textContent = nom;
                groupePerso.appendChild(option);
            });
            freeTemplateSelectEl.appendChild(groupePerso);
        }
        freeTemplateSelectEl.value = valeur;
    }

    function freeApplyTemplate(valeur) {
        if (!valeur) return;
        const [genre, nom] = [valeur.slice(0, valeur.indexOf(':')), valeur.slice(valeur.indexOf(':') + 1)];
        let elements = null;
        let options = null;

        if (genre === 'builtin') {
            const preset = FREE_BUILTIN_TEMPLATES[nom];
            if (!preset) return;
            elements = freeElementsFromPreset(preset);
            if (nom === 'Mention + cadre') options = { border: 'thick', borderWidth: 3, margin: 5 };
            if (nom === 'Bandeau inversé') options = { border: 'rounded', borderWidth: 3, margin: 4 };
        } else {
            const perso = freeLoadTemplates()[nom];
            if (!perso) return;
            elements = (perso.elements || []).map((el) => freeMakeElement(el));
            options = perso.options ? Object.assign({}, perso.options) : null;
        }

        if (freeModel.elements.length && !confirm(`Remplacer l'étiquette en cours par le modèle « ${nom} » ?`)) return;
        freeModel.elements = elements;
        if (options) Object.assign(freeModel.options, options);
        freeSel = freeModel.elements.length ? freeModel.elements[0].id : null;
        syncFreeOptionsToUI();
        freeLayersRefresh();
    }

    function freeTemplateName(prefixe) {
        const nom = window.prompt(prefixe, 'Mon modèle');
        if (!nom) return null;
        return nom.trim();
    }

    // --- IMPORT DU FORMULAIRE (même mise en page que l'étiquette standard) ---

    function freeSeedFromForm() {
        const donnees = getFormData();
        const elements = [];
        const ajouter = (props) => elements.push(freeMakeElement(props));

        if (donnees.discipline) {
            ajouter({ text: donnees.discipline.toUpperCase(), x: 12, y: 0, size: 24, bold: true, rotate: 270, align: 'right' });
        }
        if (donnees.dateEntree) {
            const parties = donnees.dateEntree.split('/');
            ajouter({ text: parties[0] || 'JJ', x: 374, y: 0, size: 36, bold: true, align: 'right' });
            const mois = getMonthName(donnees.dateEntree);
            if (mois) ajouter({ text: mois.toUpperCase(), x: 374, y: 34, size: 24, bold: true, align: 'right' });
        }

        ajouter({ text: donnees.nom || 'NOM', x: 192, y: 0, size: 46, bold: true, align: 'center' });
        ajouter({ text: donnees.prenom || 'Prénom', x: 192, y: 48, size: 38, align: 'center' });

        let texteDdn = donnees.dateNaissance || 'JJ/MM/AAAA';
        if (donnees.dateNaissance && donnees.dateNaissance.length === 10) {
            const age = calculateAge(donnees.dateNaissance);
            if (age) texteDdn += ` (${age})`;
        }
        ajouter({ text: texteDdn, x: 192, y: 88, size: 27, align: 'center' });
        ajouter({ text: donnees.motif || "Motif d'admission", x: 192, y: 119, size: 24, align: 'center', maxWidth: 280 });

        if (donnees.chambreSeule) {
            ajouter({ text: 'Ch. seule', x: 374, y: 96, size: 18, bold: true, align: 'right' });
        }

        return elements;
    }

    function freeImportForm() {
        const elements = freeSeedFromForm();
        if (freeModel.elements.length && !confirm("Remplacer l'étiquette libre en cours par les informations du formulaire ?")) return;
        freeModel.elements = elements;
        freeSel = elements.length ? elements[0].id : null;
        freeLayersRefresh();
    }

    // --- ACTIONS ---

    function freeAddText() {
        const zone = freeUsableHeight();
        const el = freeMakeElement({ text: 'Texte libre', x: 192, y: Math.max(0, Math.round(zone / 2) - 13), size: 26, align: 'center' });
        freeModel.elements.push(el);
        freeSel = el.id;
        freeLayersRefresh();
        freeTextEl.focus();
        freeTextEl.select();
    }

    function freeAddLine() {
        const zone = freeUsableHeight();
        const el = freeMakeElement({ type: 'line', x: 40, y: Math.round(zone / 2), width: 304, thickness: 3 });
        freeModel.elements.push(el);
        freeSel = el.id;
        freeLayersRefresh();
    }

    function freeResetAll() {
        if (freeModel.elements.length && !confirm("Effacer toute l'étiquette libre ?")) return;
        freeModel = freeNewModel();
        freeSel = null;
        syncFreeOptionsToUI();
        freeLayersRefresh();
    }

    function freeAddToQueue() {
        const utile = freeModel.elements.some((el) => !el.hidden && (el.type === 'line' || String(el.text || '').trim() !== ''));
        if (!utile && !confirm("Ajouter une étiquette libre vide à la file d'attente ?")) return;

        const modele = freeDeepCopy({ options: freeModel.options, elements: freeModel.elements });
        const premier = modele.elements.find((el) => el.type === 'text' && String(el.text || '').trim() !== '');
        const titre = premier ? String(premier.text).replace(/\s+/g, ' ').trim().slice(0, 24) : 'Étiquette libre';

        queue.push({
            id: Date.now() + Math.random(),
            kind: 'libre',
            model: modele,
            data: { nom: titre, prenom: '', discipline: '', dateEntree: '', motif: '', dateNaissance: '', chambreSeule: false }
        });
        renderQueue();
    }

    async function freePrintNow() {
        try {
            const postFeed = parseInt(inputPostPrintFeed.value, 10) || 20;
            const offCanvas = document.createElement('canvas');
            offCanvas.width = FREE_W;
            offCanvas.height = FREE_H;
            const offCtx = offCanvas.getContext('2d');
            renderFreeCanvas(freeModel, true, offCtx, offCanvas);
            await printCanvas(offCanvas, postFeed);
        } catch (error) {
            alert("Erreur lors de l'impression : " + error.message);
        }
    }

    function freeCanvasPoint(ev) {
        const rect = freeCanvas.getBoundingClientRect();
        return {
            x: (ev.clientX - rect.left) * (FREE_W / rect.width),
            y: (ev.clientY - rect.top) * (FREE_H / rect.height)
        };
    }

    // --- OUVERTURE / FERMETURE DE LA FENÊTRE ---

    function openFreeModal() {
        freeModal.classList.remove('hidden');
        renderFreeLayers();
        syncFreeEditor();
        renderFreePreview();
    }

    function closeFreeModal() {
        freeModal.classList.add('hidden');
        freeDrag = null;
    }

    // --- ÉCOUTEURS ---

    btnOpenFree.addEventListener('click', openFreeModal);
    btnCloseFreeModal.addEventListener('click', closeFreeModal);
    freeModal.addEventListener('click', (ev) => {
        if (ev.target === freeModal) closeFreeModal();
    });
    btnFreeAddText.addEventListener('click', freeAddText);
    btnFreeAddLine.addEventListener('click', freeAddLine);
    btnFreeDuplicate.addEventListener('click', () => { if (freeSel) freeDuplicate(freeSel); });
    btnFreeFromForm.addEventListener('click', freeImportForm);
    btnFreeReset.addEventListener('click', freeResetAll);
    btnFreeAddQueue.addEventListener('click', freeAddToQueue);
    btnFreePrint.addEventListener('click', freePrintNow);

    freeLayersEl.addEventListener('click', (ev) => {
        const ligne = ev.target.closest('.layer-item');
        if (!ligne) return;
        const id = Number(ligne.dataset.id);
        const action = ev.target.dataset ? ev.target.dataset.action : null;
        if (!action) { freeSelect(id); return; }
        ev.stopPropagation();
        if (action === 'up') freeReorder(id, 1);
        else if (action === 'down') freeReorder(id, -1);
        else if (action === 'dup') freeDuplicate(id);
        else if (action === 'eye') freeToggleHidden(id);
        else if (action === 'del') freeDelete(id);
    });

    freeTextEl.addEventListener('input', () => freeUpdate({ text: freeTextEl.value }, { skipEditor: true, skipLayers: true }));
    freeFontEl.addEventListener('change', () => freeUpdate({ font: freeFontEl.value }, { skipEditor: true }));
    freeSizeEl.addEventListener('input', () => freeUpdate({ size: Number(freeSizeEl.value) || 26 }, { skipEditor: true }));
    freeSizeNumEl.addEventListener('input', () => {
        const taille = freeClamp(Number(freeSizeNumEl.value) || 26, 6, 96);
        freeUpdate({ size: taille }, { skipEditor: true });
    });
    freePosXEl.addEventListener('input', () => freeUpdate({ x: Number(freePosXEl.value) || 0 }, { skipEditor: true }));
    freePosYEl.addEventListener('input', () => freeUpdate({ y: Number(freePosYEl.value) || 0 }, { skipEditor: true }));
    freeLineHeightEl.addEventListener('change', () => freeUpdate({ lineHeight: Number(freeLineHeightEl.value) || 1.1 }, { skipEditor: true }));
    freeSpacingEl.addEventListener('input', () => freeUpdate({ spacing: Number(freeSpacingEl.value) || 0 }, { skipEditor: true }));
    freeMaxWidthEl.addEventListener('input', () => freeUpdate({ maxWidth: freeClamp(Number(freeMaxWidthEl.value) || 0, 0, FREE_W) }, { skipEditor: true }));
    freeBoxEl.addEventListener('change', () => freeUpdate({ box: freeBoxEl.value }, { skipEditor: true }));
    freeLineWidthEl.addEventListener('input', () => freeUpdate({ width: freeClamp(Number(freeLineWidthEl.value) || 10, 4, FREE_W) }, { skipEditor: true }));
    freeLineThicknessEl.addEventListener('input', () => freeUpdate({ thickness: freeClamp(Number(freeLineThicknessEl.value) || 1, 1, 40) }, { skipEditor: true }));

    freeBoldEl.addEventListener('click', () => { const el = freeSelected(); if (el) freeUpdate({ bold: !el.bold }); });
    freeItalicEl.addEventListener('click', () => { const el = freeSelected(); if (el) freeUpdate({ italic: !el.italic }); });
    freeUnderlineEl.addEventListener('click', () => { const el = freeSelected(); if (el) freeUpdate({ underline: !el.underline }); });
    freeInvertEl.addEventListener('click', () => { const el = freeSelected(); if (el) freeUpdate({ invert: !el.invert }); });

    freeModal.querySelectorAll('[data-align]').forEach((btn) => {
        btn.addEventListener('click', () => freeUpdate({ align: btn.dataset.align }));
    });
    freeModal.querySelectorAll('[data-rotate]').forEach((btn) => {
        btn.addEventListener('click', () => freeUpdate({ rotate: Number(btn.dataset.rotate) }));
    });
    freeModal.querySelectorAll('[data-nudge]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const el = freeSelected();
            if (!el) return;
            const [dx, dy] = btn.dataset.nudge.split(',').map(Number);
            freeUpdate({ x: freeClamp(el.x + dx, -40, FREE_W + 40), y: freeClamp(el.y + dy, -40, FREE_H + 20) });
        });
    });
    freeModal.querySelectorAll('[data-pospreset]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const el = freeSelected();
            if (!el) return;
            const boite = freeElementBBox(freeMeasureCtx, el);
            const zone = freeUsableHeight();
            const preset = btn.dataset.pospreset;
            const patch = {};
            if (preset === 'center') patch.x = freeClamp(el.x - (boite.minX + boite.maxX) / 2 + FREE_W / 2, -40, FREE_W + 40);
            if (preset === 'top') patch.y = freeClamp(el.y - boite.minY, -40, FREE_H + 20);
            if (preset === 'bottom') patch.y = freeClamp(el.y - boite.maxY + zone, -40, FREE_H + 20);
            if (preset === 'left') patch.x = freeClamp(el.x - boite.minX, -40, FREE_W + 40);
            if (preset === 'right') patch.x = freeClamp(el.x - boite.maxX + FREE_W, -40, FREE_W + 40);
            freeUpdate(patch, { skipLayers: true });
        });
    });

    [freeOffsetEl, freeGuidesEl, freeGridEl, freeBorderEl, freeBorderWidthEl, freeMarginEl].forEach((champ) => {
        champ.addEventListener('change', syncFreeOptionsFromUI);
        champ.addEventListener('input', syncFreeOptionsFromUI);
    });

    freeTemplateSelectEl.addEventListener('change', () => {
        const valeur = freeTemplateSelectEl.value;
        freeTemplateSelectEl.value = '';
        if (valeur) freeApplyTemplate(valeur);
    });
    btnFreeSaveTemplate.addEventListener('click', () => {
        const nom = freeTemplateName("Nom du modèle à enregistrer :");
        if (!nom) return;
        const modeles = freeLoadTemplates();
        modeles[nom] = freeDeepCopy({ options: freeModel.options, elements: freeModel.elements });
        freeWriteTemplates(modeles);
        freeFillTemplateSelect();
        alert(`Modèle « ${nom} » enregistré.`);
    });
    btnFreeDeleteTemplate.addEventListener('click', () => {
        const perso = freeLoadTemplates();
        const noms = Object.keys(perso);
        if (!noms.length) { alert('Aucun modèle enregistré.'); return; }
        const nom = window.prompt('Nom du modèle à supprimer :\n' + noms.join(', '), noms[0]);
        if (!nom || !perso[nom]) { if (nom) alert('Modèle introuvable.'); return; }
        delete perso[nom];
        freeWriteTemplates(perso);
        freeFillTemplateSelect();
    });

    // Déplacement direct à la souris / au doigt sur l'aperçu
    freeCanvas.addEventListener('pointerdown', (ev) => {
        const point = freeCanvasPoint(ev);
        const el = freeHitTest(freeMeasureCtx, point.x, point.y);
        if (el) {
            freeSelect(el.id);
            freeDrag = { id: el.id, dx: point.x - el.x, dy: point.y - el.y };
            try { freeCanvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        } else if (freeSel !== null) {
            freeSel = null;
            renderFreeLayers();
            syncFreeEditor();
            renderFreePreview();
        }
        freeCanvas.focus();
    });

    freeCanvas.addEventListener('pointermove', (ev) => {
        if (!freeDrag) return;
        const el = freeModel.elements.find((e) => e.id === freeDrag.id);
        if (!el) return;
        const point = freeCanvasPoint(ev);
        const pas = Number(freeModel.options.grid) || 0;
        let nx = point.x - freeDrag.dx;
        let ny = point.y - freeDrag.dy;
        if (pas > 0) {
            nx = Math.round(nx / pas) * pas;
            ny = Math.round(ny / pas) * pas;
        }
        el.x = freeClamp(Math.round(nx), -40, FREE_W + 40);
        el.y = freeClamp(Math.round(ny), -40, FREE_H + 20);
        syncFreeEditor();
        renderFreePreview();
    });

    freeCanvas.addEventListener('pointerup', (ev) => {
        if (!freeDrag) return;
        freeDrag = null;
        try { freeCanvas.releasePointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        freeSave();
    });

    freeCanvas.addEventListener('pointercancel', () => { freeDrag = null; });

    // Flèches du clavier : déplacement fin ; Suppr : effacer l'élément
    document.addEventListener('keydown', (ev) => {
        if (freeModal.classList.contains('hidden')) return;
        if (ev.key === 'Escape') { closeFreeModal(); return; }

        const cible = ev.target;
        if (cible && ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName)) return;

        const el = freeSelected();
        if (!el) return;
        const pas = ev.shiftKey ? 10 : (Number(freeModel.options.grid) || 1);
        let modifie = true;

        if (ev.key === 'ArrowLeft') el.x = freeClamp(el.x - pas, -40, FREE_W + 40);
        else if (ev.key === 'ArrowRight') el.x = freeClamp(el.x + pas, -40, FREE_W + 40);
        else if (ev.key === 'ArrowUp') el.y = freeClamp(el.y - pas, -40, FREE_H + 20);
        else if (ev.key === 'ArrowDown') el.y = freeClamp(el.y + pas, -40, FREE_H + 20);
        else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); freeDelete(el.id); return; }
        else modifie = false;

        if (modifie) {
            ev.preventDefault();
            syncFreeEditor();
            renderFreePreview();
            freeSave();
        }
    });

    // --- INITIALISATION DU MODE LIBRE ---

    // Regroupe les champs réservés au texte (masqués lorsqu'un trait est sélectionné)
    [
        freeTextEl.closest('.form-group'),
        freeFontEl.closest('.form-group'),
        freeSizeNumEl.closest('.form-group'),
        freeSizeEl.closest('.form-group'),
        freeLineHeightEl.closest('.free-grid2'),
        freeBoldEl, freeItalicEl, freeUnderlineEl, freeInvertEl
    ].forEach((noeud) => { if (noeud) noeud.classList.add('free-text-only'); });
    freeModal.querySelectorAll('[data-align]').forEach((btn) => btn.classList.add('free-text-only'));

    freeFontEl.innerHTML = FREE_FONTS.map((police) => `<option value="${freeEscape(police.value)}">${freeEscape(police.label)}</option>`).join('');

    freeModel = freeLoad() || freeNewModel();
    if (!freeModel.elements.length) {
        freeModel.elements = [freeMakeElement({ text: 'Texte libre', x: 192, y: 60, size: 30, bold: true, align: 'center' })];
    }
    freeSel = freeModel.elements[0].id;
    syncFreeOptionsToUI();
    freeFillTemplateSelect();
    renderFreeLayers();
    syncFreeEditor();

    // --- CONVERSION CANVAS EN BITMAP 1-BIT AVEC SEUILLAGE AJUSTABLE ---
    /**
     * Chaque ligne de 384 pixels est convertie en 48 octets (384 / 8 = 48).
     * 1 bit = 1 pixel (1 pour noir/brûlé, 0 pour blanc).
     */
    function canvasToBitmap(canvas, thresholdValue = 128, lsbFirst = false) {
        const width = canvas.width;  // 384
        const height = canvas.height; // 240
        const imgData = canvas.getContext('2d').getImageData(0, 0, width, height).data;
        const bytesPerLine = width / 8; // 48
        const bitmap = new Uint8Array(bytesPerLine * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const offset = (y * width + x) * 4;
                const r = imgData[offset];
                const g = imgData[offset + 1];
                const b = imgData[offset + 2];
                // Calcule la luminance (niveau de gris)
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                const isBlack = luminance < thresholdValue;

                if (isBlack) {
                    const byteIdx = y * bytesPerLine + Math.floor(x / 8);
                    const bitIdx = lsbFirst ? (x % 8) : (7 - (x % 8)); // LSB or MSB First
                    bitmap[byteIdx] |= (1 << bitIdx);
                }
            }
        }
        return bitmap;
    }

    // --- PROTOCOLE TINY PRINT / GB01 COMMAND GENERATION ---
    /**
     * Paquet Tiny Print :
     * Header: 0x51 0x78 ( Magic bytes 'Qx' )
     * Command ID: 1 octet (ex: 0xA2 pour print row, 0xA1 pour feed, 0xA6 pour energy)
     * Sub/Reserved: 0x00
     * Data Length: 2 octets (Little-endian)
     * Data Payload
     * Checksum: 1 octet (CRC8 / Sum modulo 0x100 de la payload ou table Tiny Print)
     * Footer: 0xFF
     */

    const CRC8_TABLE = [
        0x00, 0x07, 0x0e, 0x09, 0x1c, 0x1b, 0x12, 0x15, 0x38, 0x3f, 0x36, 0x31, 0x24, 0x23, 0x2a, 0x2d,
        0x70, 0x77, 0x7e, 0x79, 0x6c, 0x6b, 0x62, 0x65, 0x48, 0x4f, 0x46, 0x41, 0x54, 0x53, 0x5a, 0x5d,
        0xe0, 0xe7, 0xee, 0xe9, 0xfc, 0xfb, 0xf2, 0xf5, 0xd8, 0xdf, 0xd6, 0xd1, 0xc4, 0xc3, 0xca, 0xcd,
        0x90, 0x97, 0x9e, 0x99, 0x8c, 0x8b, 0x82, 0x85, 0xa8, 0xaf, 0xa6, 0xa1, 0xb4, 0xb3, 0xba, 0xbd,
        0xc7, 0xc0, 0xc9, 0xce, 0xdb, 0xdc, 0xd5, 0xd2, 0xff, 0xf8, 0xf1, 0xf6, 0xe3, 0xe4, 0xed, 0xea,
        0xb7, 0xb0, 0xb9, 0xbe, 0xab, 0xac, 0xa5, 0xa2, 0x8f, 0x88, 0x81, 0x86, 0x93, 0x94, 0x9d, 0x9a,
        0x27, 0x20, 0x29, 0x2e, 0x3b, 0x3c, 0x35, 0x32, 0x1f, 0x18, 0x11, 0x16, 0x03, 0x04, 0x0d, 0x0a,
        0x57, 0x50, 0x59, 0x5e, 0x4b, 0x4c, 0x45, 0x42, 0x6f, 0x68, 0x61, 0x66, 0x73, 0x74, 0x7d, 0x7a,
        0x89, 0x8e, 0x87, 0x80, 0x95, 0x92, 0x9b, 0x9c, 0xb1, 0xb6, 0xbf, 0xb8, 0xad, 0xaa, 0xa3, 0xa4,
        0xf9, 0xfe, 0xf7, 0xf0, 0xe5, 0xe2, 0xeb, 0xec, 0xc1, 0xc6, 0xcf, 0xc8, 0xdd, 0xda, 0xd3, 0xd4,
        0x69, 0x6e, 0x67, 0x60, 0x75, 0x72, 0x7b, 0x7c, 0x51, 0x56, 0x5f, 0x58, 0x4d, 0x4a, 0x43, 0x44,
        0x19, 0x1e, 0x17, 0x10, 0x05, 0x02, 0x0b, 0x0c, 0x21, 0x26, 0x2f, 0x28, 0x3d, 0x3a, 0x33, 0x34,
        0x4e, 0x49, 0x40, 0x47, 0x52, 0x55, 0x5c, 0x5b, 0x76, 0x71, 0x78, 0x7f, 0x6a, 0x6d, 0x64, 0x63,
        0x3e, 0x39, 0x30, 0x37, 0x22, 0x25, 0x2c, 0x2b, 0x06, 0x01, 0x08, 0x0f, 0x1a, 0x1d, 0x14, 0x13,
        0xae, 0xa9, 0xa0, 0xa7, 0xb2, 0xb5, 0xbc, 0xbb, 0x96, 0x91, 0x98, 0x9f, 0x8a, 0x8d, 0x84, 0x83,
        0xde, 0xd9, 0xd0, 0xd7, 0xc2, 0xc5, 0xcc, 0xcb, 0xe6, 0xe1, 0xe8, 0xef, 0xfa, 0xfd, 0xf4, 0xf3
    ];

    function calculateCrc(data) {
        let crc = 0;
        for (let i = 0; i < data.length; i++) {
            crc = CRC8_TABLE[(crc ^ data[i]) & 0xFF];
        }
        return crc;
    }

    function createCmdPacket(cmd, payload = new Uint8Array(0)) {
        const len = payload.length;
        const packet = new Uint8Array(8 + len);
        packet[0] = 0x51; // 'Q'
        packet[1] = 0x78; // 'x'
        packet[2] = cmd;
        packet[3] = 0x00;
        packet[4] = len & 0xFF;
        packet[5] = (len >> 8) & 0xFF;
        if (len > 0) {
            packet.set(payload, 6);
        }
        packet[6 + len] = calculateCrc(payload);
        packet[7 + len] = 0xFF; // Footer 0xFF
        return packet;
    }

    function getEnergyPayload(density) {
        let energyValue = 12000; // Normal
        if (density === 'light') energyValue = 8000;
        if (density === 'dark') energyValue = 17500;
        const payload = new Uint8Array(2);
        payload[0] = energyValue & 0xFF;
        payload[1] = (energyValue >> 8) & 0xFF;
        return payload;
    }

    function createFeedPacket(lines) {
        const payload = new Uint8Array(2);
        payload[0] = lines & 0xFF;
        payload[1] = (lines >> 8) & 0xFF;
        return createCmdPacket(0xA1, payload);
    }

    // --- ENVOI DE DONNÉES (BLE) ---
    async function sendBytes(bytes) {
        if (bleWriteCharacteristic) {
            // Envoi via Web Bluetooth par paquets MTU
            const CHUNK_SIZE = 80; // Paquet sécurisé pour BLE
            for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
                const chunk = bytes.slice(i, i + CHUNK_SIZE);
                if (bleWriteCharacteristic.properties.writeWithoutResponse) {
                    await bleWriteCharacteristic.writeValueWithoutResponse(chunk);
                } else {
                    await bleWriteCharacteristic.writeValue(chunk);
                }
                await new Promise(resolve => setTimeout(resolve, 15));
            }
            return;
        }

        throw new Error("Imprimante non connectée.");
    }

    // --- PROTOCOLE ESC/POS RASTER GENERATION (MODÈLES X6 / WALKPRINT / POS) ---
    function buildEscPosRasterData(targetCanvas, thresholdVal = 128) {
        const width = targetCanvas.width; // 384
        const height = targetCanvas.height; // 240
        const bytesPerLine = width / 8; // 48
        const bitmap = canvasToBitmap(targetCanvas, thresholdVal, false);

        // Commande ESC/POS GS v 0 (0x1D 0x76 0x30 0x00)
        // Format: GS v 0 m xL xH yL yH data...
        const xL = bytesPerLine & 0xFF; // 48 (0x30)
        const xH = (bytesPerLine >> 8) & 0xFF; // 0
        const yL = height & 0xFF; // 240 (0xF0)
        const yH = (height >> 8) & 0xFF; // 0

        // ESC @ (Reset/Init) + GS v 0 m xL xH yL yH
        const header = new Uint8Array([
            0x1B, 0x40, // ESC @ (Init)
            0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH
        ]);

        const fullBuffer = new Uint8Array(header.length + bitmap.length);
        fullBuffer.set(header, 0);
        fullBuffer.set(bitmap, header.length);

        return fullBuffer;
    }

    function createEscPosFeedPacket(lines) {
        // ESC d n (0x1B 0x64 n) -> Avance de n lignes
        const feedCount = Math.min(Math.max(1, Math.round(lines / 3)), 255);
        return new Uint8Array([0x1B, 0x64, feedCount]);
    }

    // --- IMPRESSION D'UN CANVAS (UNIFIÉE ESC/POS & TINY PRINT GB01) ---
    async function printCanvas(targetCanvas, interFeedLines = 0) {
        updateStatus("Impression...", "printing");

        const protocol = selectProtocol ? selectProtocol.value : 'escpos';
        const thresholdVal = selectThreshold ? parseInt(selectThreshold.value, 10) : 128;
        const density = selectDensity.value;

        if (protocol === 'escpos') {
            // Mode ESC/POS Raster (Lovcoyo X6, WalkPrint, POS printers)
            const rasterBytes = buildEscPosRasterData(targetCanvas, thresholdVal);
            await sendBytes(rasterBytes);

            if (interFeedLines > 0) {
                const feedBytes = createEscPosFeedPacket(interFeedLines);
                await sendBytes(feedBytes);
            }
        } else {
            // Mode Tiny Print / GB01 (Protocole Qx 0x51 0x78)
            const bitmap = canvasToBitmap(targetCanvas, thresholdVal, true);
            const height = targetCanvas.height; // 240
            const bytesPerLine = targetCanvas.width / 8; // 48

            // 1. Initialisation GB01 (Qualité, Lattice, Energie, Mode)
            const qualityPacket = createCmdPacket(0xA4, new Uint8Array([0x33]));
            await sendBytes(qualityPacket);

            const latticePayload = new Uint8Array([0xAA, 0x55, 0x17, 0x38, 0x44, 0x5F, 0x5F, 0x5F, 0x44, 0x38, 0x2C]);
            const latticePacket = createCmdPacket(0xA6, latticePayload);
            await sendBytes(latticePacket);

            const energyPacket = createCmdPacket(0xAF, getEnergyPayload(density));
            await sendBytes(energyPacket);

            const modePacket = createCmdPacket(0xBE, new Uint8Array([0x00])); // DrawingMode: 0 (Images)
            await sendBytes(modePacket);

            const otherFeedPacket = createCmdPacket(0xBD, new Uint8Array([0x23])); // ImgPrintSpeed
            await sendBytes(otherFeedPacket);

            // 2. Envoi des lignes bitmap (Cmd 0xA2)
            for (let y = 0; y < height; y++) {
                const rowData = bitmap.slice(y * bytesPerLine, (y + 1) * bytesPerLine);
                const rowPacket = createCmdPacket(0xA2, rowData);
                await sendBytes(rowPacket);
            }

            // 3. Espace / Feed
            if (interFeedLines > 0) {
                const feedPacket = createFeedPacket(interFeedLines);
                await sendBytes(feedPacket);
            }
        }

        updateStatus("Connecté", "connected");
    }

    // --- GESTION UX DU MODAL ANDROID ---
    function setModalState(state, deviceName = '--') {
        printerMiniatureWrapper.className = `printer-miniature-wrapper state-${state}`;
        modalDeviceName.textContent = deviceName;

        if (state === 'idle') {
            radarPulse.style.display = 'none';
            modalTitle.textContent = "Connexion à l'imprimante";
            modalStatusText.textContent = "Cliquez sur le bouton pour vous connecter :";
        } else if (state === 'searching') {
            radarPulse.style.display = 'block';
            modalTitle.textContent = "Recherche d'imprimante en cours...";
            modalStatusText.textContent = "Balayage Bluetooth des appareils X6h-2CD2, X6, GB01...";
        } else if (state === 'found') {
            radarPulse.style.display = 'none';
            modalTitle.textContent = "Imprimante détectée !";
            modalStatusText.textContent = "Établissement du canal de communication...";
        } else if (state === 'connected') {
            radarPulse.style.display = 'none';
            modalTitle.textContent = "Imprimante connectée !";
            modalStatusText.textContent = "Appareil prêt pour l'impression d'étiquettes.";
        }
    }

    function openModal() {
        connectionModal.classList.remove('hidden');
        setModalState('idle', '--');
    }

    function closeModal() {
        connectionModal.classList.add('hidden');
    }

    // --- CONNEXION BLUETOOTH BLE AVEC FILTRES PAR NOM ---
    async function connectBluetoothBLE() {
        try {
            setModalState('searching', '--');
            updateStatus("Connexion BLE...", "connecting");

            const activeServices = [...BT_SERVICES];

            let deviceOptions = {
                filters: [{ namePrefix: 'X6h-2CD2' }],
                optionalServices: activeServices
            };

            bleDevice = await navigator.bluetooth.requestDevice(deviceOptions);

            // Étape 2 UX : Appareil Sélectionné / Trouvé
            setModalState('found', bleDevice.name || "X6h-2CD2");

            bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

            // Retry logic for GATT connection to handle "Connection Error: Connection attempt failed"
            let retries = 3;
            while (retries > 0) {
                try {
                    bleGattServer = await bleDevice.gatt.connect();
                    break;
                } catch (err) {
                    retries--;
                    if (retries === 0) {
                        throw err;
                    }
                    console.warn(`Erreur de connexion GATT, tentatives restantes: ${retries}. Réessai dans 500ms...`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            let targetChar = null;
            let targetNotifyChar = null;
            const discoveredInfo = [];

            let services = [];
            try {
                services = await bleGattServer.getPrimaryServices();
            } catch (e) {
                console.warn("getPrimaryServices() sans filtre a échoué, interrogation service par service.", e);
            }

            if (!services || services.length === 0) {
                for (const serviceUuid of activeServices) {
                    try {
                        const service = await bleGattServer.getPrimaryService(serviceUuid);
                        if (service) services.push(service);
                    } catch (e) {
                        // Service non présent
                    }
                }
            }

            for (const service of services) {
                try {
                    const characteristics = await service.getCharacteristics();
                    const charLogs = [];

                    for (const char of characteristics) {
                        const props = [];
                        if (char.properties.write) props.push("write");
                        if (char.properties.writeWithoutResponse) props.push("writeWithoutResponse");
                        if (char.properties.read) props.push("read");
                        if (char.properties.notify) props.push("notify");
                        if (char.properties.indicate) props.push("indicate");

                        charLogs.push(`  - Caractéristique: ${char.uuid} [${props.join(', ') || 'aucune'}]`);

                        if (!targetChar && (char.properties.write || char.properties.writeWithoutResponse)) {
                            targetChar = char;
                        }

                        if (!targetNotifyChar && (char.properties.notify || char.properties.indicate)) {
                            targetNotifyChar = char;
                        }
                    }

                    discoveredInfo.push(`Service ${service.uuid} :\n` + (charLogs.join('\n') || '  (aucune caractéristique)'));
                } catch (e) {
                    discoveredInfo.push(`Service ${service.uuid} : impossible de lire les caractéristiques (${e.message})`);
                }
            }

            if (!targetChar) {
                let diagMsg = "Impossible de trouver une caractéristique d'écriture BLE sur cet appareil.\n\n";
                if (discoveredInfo.length > 0) {
                    diagMsg += "Détails des services/caractéristiques :\n" + discoveredInfo.join('\n\n');
                } else {
                    diagMsg += "Assurez-vous que l'imprimante n'est pas jumelée dans les paramètres de votre OS ou redémarrez-la.";
                }
                throw new Error(diagMsg);
            }

            bleWriteCharacteristic = targetChar;

            if (targetNotifyChar) {
                bleNotifyCharacteristic = targetNotifyChar;
                try {
                    await bleNotifyCharacteristic.startNotifications();
                    // We keep notifications active to prevent the printer from sleeping,
                    // but we no longer display the raw hex data.
                    bleNotifyCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
                        // Keep connection alive silently
                    });
                } catch (e) {
                    console.warn("Impossible d'activer les notifications pour maintenir l'imprimante éveillée :", e);
                }
            }

            // Étape 3 UX : Connecté avec succès
            setModalState('connected', bleDevice.name || "X6h-2CD2");
            updateStatus("Connecté (BLE)", "connected");

            btnConnect.disabled = true;
            btnDisconnect.disabled = false;
            btnDisconnect.style.display = 'inline-block';
            btnConnect.style.display = 'none';
            btnManualFeed.disabled = false;
            btnPrintDirect.disabled = false;
            updateQueueButtonsState();

            setTimeout(() => closeModal(), 1800);

        } catch (error) {
            console.error("Erreur de connexion BLE:", error);
            alert("Échec de connexion Bluetooth : " + error.message);
            updateStatus("Déconnecté", "disconnected");
            closeModal();
        }
    }

    function disconnectPrinter() {
        if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
            bleDevice.gatt.disconnect();
        }
        onDisconnected();
    }

    function onDisconnected() {
        bleDevice = null;
        bleGattServer = null;
        bleWriteCharacteristic = null;
        if (bleNotifyCharacteristic) {
            bleNotifyCharacteristic = null;
        }

        updateStatus("Déconnecté", "disconnected");
        btnConnect.disabled = false;
        btnDisconnect.disabled = true;
        btnDisconnect.style.display = 'none';
        btnConnect.style.display = 'inline-block';
        btnManualFeed.disabled = true;
        btnPrintDirect.disabled = true;
        updateQueueButtonsState();
    }

    function updateStatus(text, stateClass) {
        statusBadge.textContent = text;
        statusBadge.className = `status-badge status-${stateClass}`;
    }

    // --- GESTION DE LA FILE D'ATTENTE (BATCH PRINTING) ---
    function addToQueue() {
        const data = getFormData();
        if (!data.nom && !data.prenom && !data.discipline) {
            if (!confirm("Ajouter une étiquette vide à la file d'attente ?")) return;
        }

        // Crée un canvas hors-écran pour capturer le rendu de cette étiquette
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 384;
        offCanvas.height = 240;
        const offCtx = offCanvas.getContext('2d');

        // Rendu pour l'aperçu de la file d'attente (sans rotation, isForPrint=false)
        renderCanvas(data, false, offCtx, offCanvas);

        queue.push({
            id: Date.now(),
            kind: 'standard',
            data: data,
            canvas: offCanvas
        });

        renderQueue();
    }

    function removeFromQueue(id) {
        queue = queue.filter(item => item.id !== id);
        renderQueue();
    }

    function clearQueue() {
        queue = [];
        renderQueue();
    }

    function renderQueue() {
        queueCountEl.textContent = queue.length;
        queueListEl.innerHTML = '';

        if (queue.length === 0) {
            queueListEl.innerHTML = '<p class="empty-queue-msg">Aucune étiquette dans la file d\'attente.</p>';
            btnClearQueue.disabled = true;
            updateQueueButtonsState();
            return;
        }

        btnClearQueue.disabled = false;

        queue.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'queue-item';

            let title;
            let sub;
            if (item.kind === 'libre') {
                const textes = item.model.elements
                    .filter((el) => el.type === 'text' && String(el.text || '').trim() !== '')
                    .map((el) => String(el.text).replace(/\s+/g, ' ').trim());
                title = textes.length ? (textes[0].length > 26 ? textes[0].slice(0, 26) + '…' : textes[0]) : 'Étiquette libre';
                sub = `Saisie libre • ${item.model.elements.length} élément(s)`;
            } else {
                title = `${item.data.nom || 'Sans Nom'} ${item.data.prenom || ''}`.trim() || `Étiquette #${index + 1}`;
                sub = [item.data.discipline, item.data.dateEntree].filter(Boolean).join(' • ') || 'Sans détails';
            }

            const titreSecurise = freeEscape(title);
            const sousTitreSecurise = freeEscape(sub);

            div.innerHTML = `
                <div class="queue-item-details">
                    <span class="queue-item-title">${index + 1}. ${titreSecurise}</span>
                    <span class="queue-item-sub">${sousTitreSecurise}</span>
                </div>
                <div class="queue-item-actions">
                    <button class="btn btn-small btn-danger" data-id="${item.id}" aria-label="Supprimer ${titreSecurise} de la file" title="Supprimer">X</button>
                </div>
            `;

            div.querySelector('button').addEventListener('click', () => removeFromQueue(item.id));
            queueListEl.appendChild(div);
        });

        updateQueueButtonsState();
    }

    function updateQueueButtonsState() {
        const isConnected = !!bleWriteCharacteristic;
        btnPrintBatch.disabled = !isConnected || queue.length === 0;
        if (btnFreePrint) btnFreePrint.disabled = !isConnected;
    }

    // --- IMPRESSION PAR LOT (BATCH) ---
    async function printBatchQueue() {
        if (queue.length === 0) return;

        const interFeed = parseInt(inputInterLabelFeed.value, 10) || 20;
        const postFeed = parseInt(inputPostPrintFeed.value, 10) || 20;

        try {
            for (let i = 0; i < queue.length; i++) {
                const isLast = (i === queue.length - 1);
                const feedLines = isLast ? postFeed : interFeed;

                // Recréer le canvas pour l'impression (rotation, pas de tirets)
                const printCanvasEl = document.createElement('canvas');
                printCanvasEl.width = 384;
                printCanvasEl.height = 240;
                const printCtx = printCanvasEl.getContext('2d');
                if (queue[i].kind === 'libre') {
                    renderFreeCanvas(queue[i].model, true, printCtx, printCanvasEl);
                } else {
                    renderCanvas(queue[i].data, true, printCtx, printCanvasEl);
                }

                await printCanvas(printCanvasEl, feedLines);
            }
            if (confirm("Impression terminée. Voulez-vous effacer la liste d'étiquettes ?")) {
                clearQueue();
            }
        } catch (error) {
            console.error("Erreur lors de l'impression du lot:", error);
            alert("Erreur lors de l'impression par lot : " + error.message);
        }
    }

    // --- EVENT LISTENERS ---
    btnConnect.addEventListener('click', connectBluetoothBLE);
    btnDisconnect.addEventListener('click', disconnectPrinter);

    btnCloseModal.addEventListener('click', closeModal);
    btnModalConnectBle.addEventListener('click', connectBluetoothBLE);

    btnManualFeed.addEventListener('click', async () => {
        try {
            updateStatus("Avance papier...", "printing");
            const lines = parseInt(inputInterLabelFeed.value, 10) || 30;
            const protocol = selectProtocol ? selectProtocol.value : 'escpos';

            if (protocol === 'escpos') {
                await sendBytes(createEscPosFeedPacket(lines));
            } else {
                await sendBytes(createFeedPacket(lines));
            }
            updateStatus("Connecté", "connected");
        } catch (error) {
            alert("Erreur avance papier : " + error.message);
            updateStatus("Connecté", "connected");
        }
    });

    btnPrintDirect.addEventListener('click', async () => {
        try {
            const postFeed = parseInt(inputPostPrintFeed.value, 10) || 20;

            // Créer un canvas temporaire pour l'impression (pour appliquer isForPrint = true)
            const printCanvasEl = document.createElement('canvas');
            printCanvasEl.width = 384;
            printCanvasEl.height = 240;
            const printCtx = printCanvasEl.getContext('2d');
            const currentData = getFormData();
            renderCanvas(currentData, true, printCtx, printCanvasEl);

            await printCanvas(printCanvasEl, postFeed);
        } catch (error) {
            alert("Erreur lors de l'impression : " + error.message);
        }
    });

    btnAddQueue.addEventListener('click', addToQueue);
    btnClearQueue.addEventListener('click', clearQueue);
    btnPrintBatch.addEventListener('click', printBatchQueue);

    // Initialisation
    renderCanvas();
    renderFreePreview();
    updateQueueButtonsState();
});
