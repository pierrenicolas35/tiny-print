/**
 * Application d'impression d'étiquettes thermiques BLE (50x30 mm - 384x240 px)
 * Protocole Tiny Print / GB01 / Cat Printer
 */

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
        '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service 0x180F
        // Alias courts (16-bit)
        0x18f0, 0x18f1, 0xae01, 0xae30, 0xff00, 0xfee7, 0xaf00, 0xaf02, 0xe725, 0x180a, 0x1800, 0x1801, 0x180f
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
        // Réduit à 10 pour utiliser plus d'espace et compenser l'avance matérielle.
        const OFFSET_Y = 10;

        // 1. Discipline (verticale sur le côté gauche, TOUT EN HAUT)
        if (data.discipline) {
            targetCtx.save();
            targetCtx.translate(22, OFFSET_Y);
            targetCtx.rotate(-Math.PI / 2);
            targetCtx.font = 'bold 24px Arial, sans-serif';
            targetCtx.textAlign = 'right'; // Aligné en haut
            targetCtx.fillText(data.discipline, 0, -10);
            targetCtx.restore();
        }

        // 2. Date d'entrée (verticale sur le côté droit, TOUT EN HAUT)
        if (data.dateEntree) {
            targetCtx.save();
            targetCtx.translate(targetCanvas.width - 22, OFFSET_Y);
            targetCtx.rotate(Math.PI / 2);
            targetCtx.font = 'bold 24px Arial, sans-serif';
            targetCtx.textAlign = 'left'; // Aligné en haut
            targetCtx.fillText(data.dateEntree, 0, -10);
            targetCtx.restore();
        }

        // 3. NOM (au centre, grand/gras) - Tout en haut
        targetCtx.save();
        targetCtx.textAlign = 'center';
        const nomText = data.nom ? data.nom.toUpperCase() : "NOM";
        let nomFontSize = 46;
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
        let prenomFontSize = 36;
        targetCtx.font = `${prenomFontSize}px Arial, sans-serif`;

        // On restreint la largeur pour laisser de la marge
        while (targetCtx.measureText(prenomText).width > 280 && prenomFontSize > 14) {
            prenomFontSize -= 2;
            targetCtx.font = `${prenomFontSize}px Arial, sans-serif`;
        }
        const prenomY = nomY + nomFontSize + 4;
        targetCtx.fillText(prenomText, targetCanvas.width / 2, prenomY, 280);

        // 5. Date de naissance (au centre, sous prénom)
        const dobText = data.dateNaissance ? `${data.dateNaissance}` : "JJ/MM/AAAA";
        targetCtx.font = '26px Arial, sans-serif';
        const dobY = prenomY + prenomFontSize + 8;
        targetCtx.fillText(dobText, targetCanvas.width / 2, dobY);

        // 6. Motif d'admission (en bas au centre, limité à 1 ligne)
        const motifText = data.motif ? data.motif : "Motif d'admission";
        const motifY = dobY + 28;
        let motifFontSize = 24;
        targetCtx.font = `${motifFontSize}px Arial, sans-serif`;

        // Réduire la police si le texte est trop long
        while (targetCtx.measureText(motifText).width > 280 && motifFontSize > 14) {
            motifFontSize -= 1;
            targetCtx.font = `${motifFontSize}px Arial, sans-serif`;
        }

        targetCtx.fillText(motifText, targetCanvas.width / 2, motifY, 280);

        if (!isForPrint) {
            targetCtx.save();
            targetCtx.setLineDash([5, 5]);
            targetCtx.beginPath();
            targetCtx.moveTo(0, targetCanvas.height - 80); // 1cm from bottom (80 pixels)
            targetCtx.lineTo(targetCanvas.width, targetCanvas.height - 80);
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
            motif: inputMotif.value.trim()
        };
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
                acceptAllDevices: true,
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
                    bleNotifyCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
                        const value = event.target.value;
                        let hexString = '';
                        for (let i = 0; i < value.byteLength; i++) {
                            hexString += value.getUint8(i).toString(16).padStart(2, '0') + ' ';
                        }
                        const feedbackEl = document.getElementById('printerFeedback');
                        if (feedbackEl) {
                            feedbackEl.textContent = hexString.trim().toUpperCase();
                        }
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

        const feedbackEl = document.getElementById('printerFeedback');
        if (feedbackEl) {
            feedbackEl.textContent = "Aucune donnée";
        }

        updateStatus("Déconnecté", "disconnected");
        btnConnect.disabled = false;
        btnDisconnect.disabled = true;
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

            const title = `${item.data.nom || 'Sans Nom'} ${item.data.prenom || ''}`.trim() || `Étiquette #${index + 1}`;
            const sub = [item.data.discipline, item.data.dateEntree].filter(Boolean).join(' • ') || 'Sans détails';

            div.innerHTML = `
                <div class="queue-item-details">
                    <span class="queue-item-title">${index + 1}. ${title}</span>
                    <span class="queue-item-sub">${sub}</span>
                </div>
                <div class="queue-item-actions">
                    <button class="btn btn-small btn-danger" data-id="${item.id}">X</button>
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
    }

    // --- IMPRESSION PAR LOT (BATCH) ---
    async function printBatchQueue() {
        if (queue.length === 0) return;

        const interFeed = parseInt(inputInterLabelFeed.value, 10) || 20;
        const postFeed = parseInt(inputPostPrintFeed.value, 10) || 60;

        try {
            for (let i = 0; i < queue.length; i++) {
                const isLast = (i === queue.length - 1);
                const feedLines = isLast ? postFeed : interFeed;

                // Recréer le canvas pour l'impression (rotation, pas de tirets)
                const printCanvasEl = document.createElement('canvas');
                printCanvasEl.width = 384;
                printCanvasEl.height = 240;
                const printCtx = printCanvasEl.getContext('2d');
                renderCanvas(queue[i].data, true, printCtx, printCanvasEl);

                await printCanvas(printCanvasEl, feedLines);
            }
            alert("Impression du lot terminée avec succès !");
            clearQueue();
        } catch (error) {
            console.error("Erreur lors de l'impression du lot:", error);
            alert("Erreur lors de l'impression par lot : " + error.message);
        }
    }

    // --- EVENT LISTENERS ---
    btnConnect.addEventListener('click', openModal);
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
            const postFeed = parseInt(inputPostPrintFeed.value, 10) || 60;

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
});
