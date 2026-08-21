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
    const selectDensity = document.getElementById('printDensity');
    const inputInterLabelFeed = document.getElementById('interLabelFeed');
    const inputPostPrintFeed = document.getElementById('postPrintFeed');

    // Queue UI
    const btnAddQueue = document.getElementById('btnAddQueue');
    const btnClearQueue = document.getElementById('btnClearQueue');
    const queueListEl = document.getElementById('queueList');
    const queueCountEl = document.getElementById('queueCount');

    // State
    let queue = [];
    let bleDevice = null;
    let bleGattServer = null;
    let bleWriteCharacteristic = null;

    // Services UUIDs connus pour les imprimantes Tiny Print / GB01 / MX06 / Cat Printers
    const BT_SERVICES = [
        '0000ff00-0000-1000-8000-00805f9b34fb', // Standard Tiny Print / GB01 Service 0xFF00
        '0000fee7-0000-1000-8000-00805f9b34fb', // Alternative GB01 / PassThrough Service
        '49535343-fe7d-4113-a20f-480805411652', // Microchip / UART Service
        '000018f0-0000-1000-8000-00805f9b34fb'  // Serial Service
    ];

    const BT_CHARACTERISTICS = [
        '0000ff02-0000-1000-8000-00805f9b34fb', // Standard Tiny Print Write
        '0000ff01-0000-1000-8000-00805f9b34fb',
        '0000fee2-0000-1000-8000-00805f9b34fb',
        '49535343-8841-43f4-a8d4-ecbe34729bb3'
    ];

    // --- DESSIN DU CANVAS (384 x 240) ---
    function renderCanvas(data = getFormData()) {
        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';

        // 1. Discipline (verticale le long du bord gauche)
        if (data.discipline) {
            ctx.save();
            ctx.translate(22, canvas.height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.font = 'bold 18px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(data.discipline, 0, -8);
            ctx.restore();
        }

        // 2. Date d'entrée (en haut à droite, format JJ/MM)
        if (data.dateEntree) {
            ctx.save();
            ctx.textAlign = 'right';
            ctx.font = '13px Arial, sans-serif';
            ctx.fillText("Date d'entrée", canvas.width - 15, 12);
            ctx.fillText(data.dateEntree, canvas.width - 15, 28);
            ctx.restore();
        }

        // 3. NOM (au centre, grand/gras)
        ctx.save();
        ctx.textAlign = 'center';
        const nomText = data.nom ? data.nom.toUpperCase() : "NOM";
        ctx.font = 'bold 32px Arial, sans-serif';
        ctx.fillText(nomText, canvas.width / 2 + 10, 35);

        // 4. Prénom (au centre, sous le NOM)
        const prenomText = data.prenom ? data.prenom : "Prénom";
        ctx.font = '26px Arial, sans-serif';
        ctx.fillText(prenomText, canvas.width / 2 + 10, 82);

        // 5. Date de naissance (au centre)
        const dobText = data.dateNaissance ? `Date de naissance ${data.dateNaissance}` : "Date de naissance format JJ/MM/AAAA";
        ctx.font = '15px Arial, sans-serif';
        ctx.fillText(dobText, canvas.width / 2 + 10, 135);

        // 6. Motif d'admission (en bas au centre)
        if (data.motif) {
            ctx.font = '13px Arial, sans-serif';
            ctx.fillText(data.motif, canvas.width / 2 + 10, 185);
        } else {
            ctx.font = '13px Arial, sans-serif';
            ctx.fillText("Motif", canvas.width / 2 + 10, 180);
            ctx.fillText("d'admission", canvas.width / 2 + 10, 196);
        }

        ctx.restore();
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

    // Écouteurs de formulaire pour rendu temps réel
    [inputDiscipline, inputDateEntree, inputNom, inputPrenom, inputDateNaissance, inputMotif].forEach(input => {
        input.addEventListener('input', () => renderCanvas());
    });

    // --- CONVERSION CANVAS EN BITMAP 1-BIT (TINY PRINT) ---
    /**
     * Chaque ligne de 384 pixels est convertie en 48 octets (384 / 8 = 48).
     * 1 bit = 1 pixel (1 pour noir/brûlé, 0 pour blanc).
     */
    function canvasToBitmap(canvas) {
        const width = canvas.width;  // 384
        const height = canvas.height; // 240
        const imgData = ctx.getImageData(0, 0, width, height).data;
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
                const isBlack = luminance < 128; // Seuillage 50%

                if (isBlack) {
                    const byteIdx = y * bytesPerLine + Math.floor(x / 8);
                    const bitIdx = 7 - (x % 8); // MSB First
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
        let energyValue = 0x00FF; // Normal
        if (density === 'light') energyValue = 0x007F;
        if (density === 'dark') energyValue = 0x03FF;
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

    // --- ENVOI BLE PAR CHUNKS (MTU SAFE) ---
    async function sendBytes(bytes) {
        if (!bleWriteCharacteristic) {
            throw new Error("Imprimante non connectée.");
        }

        const CHUNK_SIZE = 80; // Safe MTU size for BLE
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            const chunk = bytes.slice(i, i + CHUNK_SIZE);
            if (bleWriteCharacteristic.properties.writeWithoutResponse) {
                await bleWriteCharacteristic.writeValueWithoutResponse(chunk);
            } else {
                await bleWriteCharacteristic.writeValue(chunk);
            }
            // Petite pause pour ne pas saturer le buffer de l'imprimante
            await new Promise(resolve => setTimeout(resolve, 15));
        }
    }

    // --- IMPRESSION D'UN CANVAS ---
    async function printCanvas(targetCanvas, interFeedLines = 0) {
        updateStatus("Impression...", "printing");

        const density = selectDensity.value;
        const bitmap = canvasToBitmap(targetCanvas);
        const height = targetCanvas.height; // 240
        const bytesPerLine = targetCanvas.width / 8; // 48

        // 1. Commande d'énergie / densité (Cmd 0xA6)
        const energyPacket = createCmdPacket(0xA6, getEnergyPayload(density));
        await sendBytes(energyPacket);

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

        updateStatus("Connecté", "connected");
    }

    // --- WEB BLUETOOTH MANAGEMENT ---
    async function connectBluetooth() {
        try {
            updateStatus("Connexion...", "connecting");

            bleDevice = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: BT_SERVICES
            });

            bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

            bleGattServer = await bleDevice.gatt.connect();

            // Recherche du service et de la caractéristique d'écriture
            let targetChar = null;
            for (const serviceUuid of BT_SERVICES) {
                try {
                    const service = await bleGattServer.getPrimaryService(serviceUuid);
                    if (service) {
                        const characteristics = await service.getCharacteristics();
                        for (const char of characteristics) {
                            if (char.properties.write || char.properties.writeWithoutResponse) {
                                targetChar = char;
                                break;
                            }
                        }
                    }
                } catch (e) {
                    // Service non trouvé sur cet appareil, continuer
                }
                if (targetChar) break;
            }

            if (!targetChar) {
                throw new Error("Impossible de trouver une caractéristique d'écriture compatible sur cet appareil.");
            }

            bleWriteCharacteristic = targetChar;
            updateStatus("Connecté", "connected");
            btnConnect.disabled = true;
            btnDisconnect.disabled = false;
            btnManualFeed.disabled = false;
            btnPrintDirect.disabled = false;
            updateQueueButtonsState();

        } catch (error) {
            console.error("Erreur de connexion BLE:", error);
            alert("Échec de connexion Bluetooth : " + error.message);
            updateStatus("Déconnecté", "disconnected");
        }
    }

    function disconnectBluetooth() {
        if (bleDevice && bleDevice.gatt.connected) {
            bleDevice.gatt.disconnect();
        }
        onDisconnected();
    }

    function onDisconnected() {
        bleDevice = null;
        bleGattServer = null;
        bleWriteCharacteristic = null;
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
        offCtx.drawImage(canvas, 0, 0);

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
                await printCanvas(queue[i].canvas, feedLines);
            }
            alert("Impression du lot terminée avec succès !");
            clearQueue();
        } catch (error) {
            console.error("Erreur lors de l'impression du lot:", error);
            alert("Erreur lors de l'impression par lot : " + error.message);
        }
    }

    // --- EVENT LISTENERS ---
    btnConnect.addEventListener('click', connectBluetooth);
    btnDisconnect.addEventListener('click', disconnectBluetooth);

    btnManualFeed.addEventListener('click', async () => {
        try {
            updateStatus("Avance papier...", "printing");
            const lines = parseInt(inputInterLabelFeed.value, 10) || 30;
            await sendBytes(createFeedPacket(lines));
            updateStatus("Connecté", "connected");
        } catch (error) {
            alert("Erreur avance papier : " + error.message);
            updateStatus("Connecté", "connected");
        }
    });

    btnPrintDirect.addEventListener('click', async () => {
        try {
            const postFeed = parseInt(inputPostPrintFeed.value, 10) || 60;
            await printCanvas(canvas, postFeed);
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
