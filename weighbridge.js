// KissanSetu - IoT Weighbridge Service (weighbridge.js)
// Modular service for IoT weighbridge scale integration & Web Serial API connection

class WeighbridgeService {
    constructor() {
        this.status = "OFFLINE"; // OFFLINE, SIMULATOR, PHYSICAL_CONNECTED
        this.grossWeight = 0.0;
        this.tareWeight = 0.0;
        this.serialPort = null;
        this.reader = null;
    }

    // Start Simulator Mode
    startSimulator(initialGross = 0.0, initialTare = 0.0) {
        this.status = "SIMULATOR";
        this.grossWeight = parseFloat(initialGross) || 0.0;
        this.tareWeight = parseFloat(initialTare) || 0.0;
        return {
            status: this.status,
            gross: this.grossWeight,
            tare: this.tareWeight,
            net: this.getNetWeight()
        };
    }

    // Connect to Physical IoT Scale via Web Serial API (Chrome/Edge)
    async connectPhysicalScale() {
        if ('serial' in navigator) {
            try {
                this.serialPort = await navigator.serial.requestPort();
                await this.serialPort.open({ baudRate: 9600 });
                this.status = "PHYSICAL_CONNECTED";
                this.readSerialStream();
                return { success: true, message: "Physical IoT Weighbridge Connected" };
            } catch (err) {
                console.warn("Serial connection canceled or failed:", err);
                return { success: false, message: "Serial connection canceled. Using Simulator mode." };
            }
        } else {
            return { success: false, message: "Web Serial API not supported in this browser. Using Simulator mode." };
        }
    }

    async readSerialStream() {
        if (!this.serialPort) return;
        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = this.serialPort.readable.pipeTo(textDecoder.writable);
        this.reader = textDecoder.readable.getReader();

        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) break;
                if (value) {
                    const parsedWeight = parseFloat(value.trim());
                    if (!isNaN(parsedWeight)) {
                        this.grossWeight = parsedWeight;
                        if (window.onWeighbridgeWeightChange) {
                            window.onWeighbridgeWeightChange(this.getWeightData());
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Serial stream error:", error);
        } finally {
            this.reader.releaseLock();
        }
    }

    setGrossWeight(weight) {
        this.grossWeight = Math.max(0, parseFloat(weight) || 0);
        return this.getWeightData();
    }

    setTareWeight(weight) {
        this.tareWeight = Math.max(0, parseFloat(weight) || 0);
        return this.getWeightData();
    }

    getNetWeight() {
        return Math.max(0, this.grossWeight - this.tareWeight);
    }

    getWeightData() {
        return {
            status: this.status,
            gross: this.grossWeight,
            tare: this.tareWeight,
            net: this.getNetWeight()
        };
    }

    disconnect() {
        if (this.reader) {
            this.reader.cancel();
        }
        if (this.serialPort) {
            this.serialPort.close();
        }
        this.status = "OFFLINE";
        this.grossWeight = 0;
        this.tareWeight = 0;
    }
}

// Export singleton instance to window
window.kissanSetuWeighbridge = new WeighbridgeService();
window.anvayaWeighbridge = window.kissanSetuWeighbridge; // Backwards compatibility alias

