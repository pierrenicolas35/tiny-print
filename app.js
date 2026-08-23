/**
 * Application d'impression d'étiquettes thermiques BLE (50x30 mm - 384x240 px)
 * Protocole Tiny Print / GB01 / Cat Printer
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- REGISTRE DES TYPES D'IMPRESSION ---
    const PRINT_TYPES = [
        {
            id: 'etiquettes_entrees',
            title: 'Étiquettes entrées',
            description: 'Étiquette d\'admission avec Discipline, NOM, Prénom, Date de naissance et Motif.',
            icon: '🏷️',
            defaultData: {
                discipline: '',
                dateEntree: '',
                nom: '',
                prenom: '',
                dateNaissance: '',
                motif: ''
            },
            renderForm: (container, onInputChange) => {
                container.innerHTML = `
                    <form id="labelForm" onsubmit="return false;">
                        <div class="form-group">
                            <label for="inputDiscipline">Discipline :</label>
                            <input type="text" id="inputDiscipline" class="form-control" placeholder="ex: Cardiologie">
                        </div>

                        <div class="form-group">
                            <label for="inputDateEntree">Date d'entrée :</label>
                            <input type="text" id="inputDateEntree" class="form-control" placeholder="JJ/MM">
                        </div>

                        <div class="form-row">
                            <div class="form-group col">
                                <label for="inputNom">NOM :</label>
                                <input type="text" id="inputNom" class="form-control" placeholder="NOM">
                            </div>
                            <div class="form-group col">
                                <label for="inputPrenom">Prénom :</label>
                                <input type="text" id="inputPrenom" class="form-control" placeholder="Prénom">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="inputDateNaissance">Date de naissance :</label>
                            <input type="text" id="inputDateNaissance" class="form-control" placeholder="JJ/MM/AAAA">
                        </div>

                        <div class="form-group">
                            <label for="inputMotif">Motif d'admission :</label>
                            <input type="text" id="inputMotif" class="form-control" placeholder="ex: Consultation">
                        </div>
                    </form>
                `;

                const inputs = container.querySelectorAll('input');
                inputs.forEach(input => input.addEventListener('input', onInputChange));
            },
            getFormData: (container) => {
                return {
                    discipline: (container.querySelector('#inputDiscipline')?.value || '').trim(),
                    dateEntree: (container.querySelector('#inputDateEntree')?.value || '').trim(),
                    nom: (container.querySelector('#inputNom')?.value || '').trim(),
                    prenom: (container.querySelector('#inputPrenom')?.value || '').trim(),
                    dateNaissance: (container.querySelector('#inputDateNaissance')?.value || '').trim(),
                    motif: (container.querySelector('#inputMotif')?.value || '').trim()
                };
            },
            renderCanvas: (ctx, width, height, data) => {
                // Clear canvas avec fond blanc
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);

                ctx.fillStyle = '#000000';
                ctx.textBaseline = 'top';

                // 1. Discipline (verticale le long du bord gauche)
                if (data.discipline) {
                    ctx.save();
                    ctx.translate(22, height / 2);
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
                    ctx.fillText("Date d'entrée", width - 15, 12);
                    ctx.fillText(data.dateEntree, width - 15, 28);
                    ctx.restore();
                }

                // 3. NOM (au centre, grand/gras)
                ctx.save();
                ctx.textAlign = 'center';
                const nomText = data.nom ? data.nom.toUpperCase() : "NOM";
                ctx.font = 'bold 32px Arial, sans-serif';
                ctx.fillText(nomText, width / 2 + 10, 35);

                // 4. Prénom (au centre, sous le NOM)
                const prenomText = data.prenom ? data.prenom : "Prénom";
                ctx.font = '26px Arial, sans-serif';
                ctx.fillText(prenomText, width / 2 + 10, 82);

                // 5. Date de naissance (au centre)
                const dobText = data.dateNaissance ? `Date de naissance ${data.dateNaissance}` : "Date de naissance format JJ/MM/AAAA";
                ctx.font = '15px Arial, sans-serif';
                ctx.fillText(dobText, width / 2 + 10, 135);

                // 6. Motif d'admission (en bas au centre)
                if (data.motif) {
                    ctx.font = '13px Arial, sans-serif';
                    ctx.fillText(data.motif, width / 2 + 10, 185);
                } else {
                    ctx.font = '13px Arial, sans-serif';
                    ctx.fillText("Motif", width / 2 + 10, 180);
                    ctx.fillText("d'admission", width / 2 + 10, 196);
                }

                ctx.restore();
            },
            getQueueTitle: (data) => {
                return `${data.nom || 'Sans Nom'} ${data.prenom || ''}`.trim() || 'Étiquette entrée';
            },
            getQueueSub: (data) => {
                return [data.discipline, data.dateEntree].filter(Boolean).join(' • ') || 'Sans détails';
            }
        }
    ];

    // --- DOM ELEMENTS ---
    const homeView = document.getElementById('homeView');
    const printView = document.getElementById('printView');
    const printTypesGrid = document.getElementById('printTypesGrid');
    const btnBackHome = document.getElementById('btnBackHome');
    const activeTypeTitle = document.getElementById('activeTypeTitle');
    const dynamicFormContainer = document.getElementById('dynamicFormContainer');

    // Device & Mobile Tabs UI
    const btnToggleDevice = document.getElementById('btnToggleDevice');
    const deviceModeIcon = document.getElementById('deviceModeIcon');
    const deviceModeText = document.getElementById('deviceModeText');
    const mobileTabs = document.getElementById('mobileTabs');
    const sectionForm = document.getElementById('sectionForm');
    const sectionPreview = document.getElementById('sectionPreview');
    const sectionPrinter = document.getElementById('sectionPrinter');
    const sectionQueue = document.getElementById('sectionQueue');
    const tabQueueCount = document.getElementById('tabQueueCount');

    // Canvas & Context
    const canvas = document.getElementById('labelCanvas');
    const ctx = canvas.getContext('2d');

    // Bluetooth UI
    const statusBadge = document.getElementById('bluetoothStatus');
    const btnConnect = document.getElementById('btnConnect');
    const btnDisconnect = document.getElementById('btnDisconnect');
    const btnManualFeed = document.getElementById('btnManualFeed');
    const btnPrintDirect = document.getElementById('btnPrintDirect');
    const btnPrintDirectMobile = document.getElementById('btnPrintDirectMobile');
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

    // --- STATE ---
    let activePrintType = null;
    let isMobile = false;
    let activeTab = 'form'; // 'form' | 'preview' | 'printer'
    let queue = [];
    let bleDevice = null;
    let bleGattServer = null;
    let bleWriteCharacteristic = null;

    // Services UUIDs connus pour les imprimantes thermiques BLE
    const BT_SERVICES = [
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000fee7-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4113-a20f-480805411652',
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000ae01-0000-1000-8000-00805f9b34fb',
        '0000af00-0000-1000-8000-00805f9b34fb',
        '0000af02-0000-1000-8000-00805f9b34fb',
        '0000e725-0000-1000-8000-00805f9b34fb',
        '0000ff01-0000-1000-8000-00805f9b34fb',
        '000018f1-0000-1000-8000-00805f9b34fb',
        '0000ffff-0000-1000-8000-00805f9b34fb',
        '00001101-0000-1000-8000-00805f9b34fb'
    ];

    // --- DETECTION DU DEVICE (MOBILE VS DESKTOP) ---
    function detectDevice() {
        const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const smallScreen = window.innerWidth <= 768;
        return userAgentMobile || smallScreen;
    }

    function setDeviceMode(mobile) {
        isMobile = mobile;
        if (isMobile) {
            deviceModeIcon.textContent = '💻';
            deviceModeText.textContent = 'Mode PC';
            document.body.classList.add('mobile-mode');
            mobileTabs.classList.remove('hidden');
            updateMobileTabsLayout();
        } else {
            deviceModeIcon.textContent = '📱';
            deviceModeText.textContent = 'Mode Mobile';
            document.body.classList.remove('mobile-mode');
            mobileTabs.classList.add('hidden');
            // Réafficher toutes les sections
            [sectionForm, sectionPreview, sectionPrinter, sectionQueue].forEach(sec => sec.classList.remove('tab-hidden'));
        }
    }

    function updateMobileTabsLayout() {
        if (!isMobile) return;

        // Mise à jour de l'onglet actif dans la nav
        const tabBtns = mobileTabs.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === activeTab);
        });

        // Visibilité des sections selon l'onglet
        sectionForm.classList.toggle('tab-hidden', activeTab !== 'form');
        sectionPreview.classList.toggle('tab-hidden', activeTab !== 'preview');
        sectionPrinter.classList.toggle('tab-hidden', activeTab !== 'printer');
        sectionQueue.classList.toggle('tab-hidden', activeTab !== 'printer');
    }

    // Event listeners pour le changement de mode et d'onglets
    btnToggleDevice.addEventListener('click', () => setDeviceMode(!isMobile));

    mobileTabs.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeTab = e.currentTarget.dataset.tab;
            updateMobileTabsLayout();
        });
    });

    // --- NAVIGATION ET SELECTION DU TYPE D'IMPRESSION ---
    function initHomeScreen() {
        printTypesGrid.innerHTML = '';
        PRINT_TYPES.forEach(type => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'print-type-card';

            const icon = document.createElement('span');
            icon.className = 'print-type-icon';
            icon.textContent = type.icon;

            const content = document.createElement('span');
            content.className = 'print-type-content';

            const title = document.createElement('span');
            title.className = 'print-type-title';
            title.textContent = type.title;

            const description = document.createElement('span');
            description.className = 'print-type-description';
            description.textContent = type.description;

            const cta = document.createElement('span');
            cta.className = 'btn btn-primary btn-small';
            cta.textContent = 'Sélectionner →';
            cta.setAttribute('aria-hidden', 'true');

            content.appendChild(title);
            content.appendChild(description);
            card.appendChild(icon);
            card.appendChild(content);
            card.appendChild(cta);
            card.addEventListener('click', () => selectPrintType(type));
            printTypesGrid.appendChild(card);
        });
    }

    function selectPrintType(type) {
        activePrintType = type;
        activeTypeTitle.textContent = type.title;

        // Rendu du formulaire spécifique
        type.renderForm(dynamicFormContainer, () => triggerRenderCanvas());

        // Premier rendu Canvas
        triggerRenderCanvas();

        // Switch de vue
        homeView.classList.add('hidden');
        printView.classList.remove('hidden');

        // Réinitialiser vers le premier onglet en mobile
        activeTab = 'form';
        updateMobileTabsLayout();
    }

    btnBackHome.addEventListener('click', () => {
        printView.classList.add('hidden');
        homeView.classList.remove('hidden');
        activePrintType = null;
    });

    // --- RENDU DU CANVAS ---
    function triggerRenderCanvas() {
        if (!activePrintType) return;
        const formData = activePrintType.getFormData(dynamicFormContainer);
        activePrintType.renderCanvas(ctx, canvas.width, canvas.height, formData);
    }

    // --- CONVERSION CANVAS EN BITMAP 1-BIT (TINY PRINT) ---
    function canvasToBitmap(canvasToConvert) {
        const width = canvasToConvert.width;
        const height = canvasToConvert.height;
        const canvasCtx = canvasToConvert.getContext('2d');
        const imgData = canvasCtx.getImageData(0, 0, width, height).data;
        const bytesPerLine = width / 8;
        const bitmap = new Uint8Array(bytesPerLine * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const offset = (y * width + x) * 4;
                const r = imgData[offset];
                const g = imgData[offset + 1];
                const b = imgData[offset + 2];
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                const isBlack = luminance < 128;

                if (isBlack) {
                    const byteIdx = y * bytesPerLine + Math.floor(x / 8);
                    const bitIdx = 7 - (x % 8);
                    bitmap[byteIdx] |= (1 << bitIdx);
                }
            }
        }
        return bitmap;
    }

    // --- PROTOCOLE TINY PRINT / GB01 ---
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
        packet[7 + len] = 0xFF;
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

    // --- ENVOI BLE PAR CHUNKS ---
    async function sendBytes(bytes) {
        if (!bleWriteCharacteristic) {
            throw new Error("Imprimante non connectée.");
        }

        const CHUNK_SIZE = 80;
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            const chunk = bytes.slice(i, i + CHUNK_SIZE);
            if (bleWriteCharacteristic.properties.writeWithoutResponse) {
                await bleWriteCharacteristic.writeValueWithoutResponse(chunk);
            } else {
                await bleWriteCharacteristic.writeValue(chunk);
            }
            await new Promise(resolve => setTimeout(resolve, 15));
        }
    }

    // --- IMPRESSION D'UN CANVAS ---
    async function printCanvas(targetCanvas, interFeedLines = 0) {
        updateStatus("Impression...", "printing");

        const density = selectDensity.value;
        const bitmap = canvasToBitmap(targetCanvas);
        const height = targetCanvas.height;
        const bytesPerLine = targetCanvas.width / 8;

        const energyPacket = createCmdPacket(0xA6, getEnergyPayload(density));
        await sendBytes(energyPacket);

        for (let y = 0; y < height; y++) {
            const rowData = bitmap.slice(y * bytesPerLine, (y + 1) * bytesPerLine);
            const rowPacket = createCmdPacket(0xA2, rowData);
            await sendBytes(rowPacket);
        }

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

            let targetChar = null;
            const discoveredInfo = [];

            let services = [];
            try {
                services = await bleGattServer.getPrimaryServices();
            } catch (e) {
                console.warn("getPrimaryServices() non supporté ou a échoué, repli sur UUIDs.", e);
            }

            if (!services || services.length === 0) {
                for (const serviceUuid of BT_SERVICES) {
                    try {
                        const service = await bleGattServer.getPrimaryService(serviceUuid);
                        if (service) services.push(service);
                    } catch (e) {}
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

                        charLogs.push(`- Caractéristique: ${char.uuid} [${props.join(', ') || 'aucune'}]`);

                        if (!targetChar && (char.properties.write || char.properties.writeWithoutResponse)) {
                            targetChar = char;
                        }
                    }

                    discoveredInfo.push(`Service ${service.uuid} :\n` + (charLogs.join('\n') || '  (aucune caractéristique)'));
                } catch (e) {
                    discoveredInfo.push(`Service ${service.uuid} : impossible de lire les caractéristiques (${e.message})`);
                }
            }

            if (!targetChar) {
                let diagMsg = "Impossible de trouver une caractéristique d'écriture compatible sur cet appareil.\n\n";
                if (discoveredInfo.length > 0) {
                    diagMsg += "Détails des services/caractéristiques détectés :\n" + discoveredInfo.join('\n\n');
                } else {
                    diagMsg += "Aucun service primaire n'a pu être inspecté sur cet appareil.";
                }
                throw new Error(diagMsg);
            }

            bleWriteCharacteristic = targetChar;
            updateStatus("Connecté", "connected");
            btnConnect.disabled = true;
            btnDisconnect.disabled = false;
            btnManualFeed.disabled = false;
            btnPrintDirect.disabled = false;
            btnPrintDirectMobile.disabled = false;
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
        btnPrintDirectMobile.disabled = true;
        updateQueueButtonsState();
    }

    function updateStatus(text, stateClass) {
        statusBadge.textContent = text;
        statusBadge.className = `status-badge status-${stateClass}`;
    }

    // --- GESTION DE LA FILE D'ATTENTE GLOBAL ---
    function addToQueue() {
        if (!activePrintType) return;
        const formData = activePrintType.getFormData(dynamicFormContainer);

        // Crée un canvas hors-écran
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 384;
        offCanvas.height = 240;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(canvas, 0, 0);

        queue.push({
            id: Date.now(),
            printTypeId: activePrintType.id,
            printTypeTitle: activePrintType.title,
            title: activePrintType.getQueueTitle(formData),
            sub: activePrintType.getQueueSub(formData),
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
        const count = queue.length;
        queueCountEl.textContent = count;
        tabQueueCount.textContent = count;
        queueListEl.innerHTML = '';

        if (count === 0) {
            queueListEl.innerHTML = '<p class="empty-queue-msg">Aucune étiquette dans la file d\'attente.</p>';
            btnClearQueue.disabled = true;
            updateQueueButtonsState();
            return;
        }

        btnClearQueue.disabled = false;

        queue.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'queue-item';

            div.innerHTML = `
                <div class="queue-item-details">
                    <span class="queue-item-title">${index + 1}. ${item.title}</span>
                    <span class="queue-item-sub">[${item.printTypeTitle}] ${item.sub}</span>
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

    async function handleDirectPrint() {
        try {
            const postFeed = parseInt(inputPostPrintFeed.value, 10) || 60;
            await printCanvas(canvas, postFeed);
        } catch (error) {
            alert("Erreur lors de l'impression : " + error.message);
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

    btnPrintDirect.addEventListener('click', handleDirectPrint);
    btnPrintDirectMobile.addEventListener('click', handleDirectPrint);

    btnAddQueue.addEventListener('click', addToQueue);
    btnClearQueue.addEventListener('click', clearQueue);
    btnPrintBatch.addEventListener('click', printBatchQueue);

    // Initialisation du device mode et de l'écran d'accueil
    setDeviceMode(detectDevice());
    initHomeScreen();
});
