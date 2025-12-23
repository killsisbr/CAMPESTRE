import express from 'express';

const router = express.Router();

// Exporta uma função que recebe whatsappService e robotEnabled como closure
export default function (getWhatsappService, getRobotEnabled, setRobotEnabled) {

    // Status do WhatsApp
    router.get('/status', async (req, res) => {
        try {
            const whatsappService = getWhatsappService();
            if (!whatsappService) {
                return res.json({
                    connected: false,
                    qrCodeAvailable: false,
                    message: 'Servico WhatsApp nao inicializado'
                });
            }

            const status = whatsappService.getStatus();

            res.json({
                connected: status.connected,
                qrCodeAvailable: status.qrCodeAvailable,
                clientReady: status.clientReady,
                message: status.connected ? 'Conectado' : (status.qrCodeAvailable ? 'Aguardando QR Code' : 'Desconectado')
            });
        } catch (error) {
            console.error('Erro ao verificar status WhatsApp:', error);
            res.json({ connected: false, qrCodeAvailable: false, error: error.message });
        }
    });

    // QR Code do WhatsApp
    router.get('/qrcode', async (req, res) => {
        try {
            const whatsappService = getWhatsappService();
            if (!whatsappService) {
                return res.json({
                    available: false,
                    message: 'Servico WhatsApp nao inicializado'
                });
            }

            // Verificar se há QR code disponível
            if (!whatsappService.lastQRCode) {
                return res.json({
                    available: false,
                    message: 'QR Code nao disponivel'
                });
            }

            // Gerar DataURL do QR Code
            try {
                const dataUrl = await whatsappService.getQRCodeDataURL();
                res.json({
                    available: true,
                    dataUrl: dataUrl
                });
            } catch (qrError) {
                res.json({
                    available: false,
                    message: qrError.message || 'Erro ao gerar QR Code'
                });
            }
        } catch (error) {
            console.error('Erro ao obter QR code:', error);
            res.json({ available: false, error: error.message });
        }
    });

    // Desconectar WhatsApp (logout)
    router.post('/disconnect', async (req, res) => {
        try {
            const whatsappService = getWhatsappService();
            if (!whatsappService) {
                return res.status(400).json({
                    success: false,
                    error: 'Serviço WhatsApp não inicializado'
                });
            }

            const result = await whatsappService.disconnect();
            res.json(result);
        } catch (error) {
            console.error('Erro ao desconectar WhatsApp:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erro ao desconectar'
            });
        }
    });

    // Reiniciar WhatsApp
    router.post('/restart', async (req, res) => {
        try {
            const whatsappService = getWhatsappService();
            if (!whatsappService) {
                return res.status(400).json({
                    success: false,
                    error: 'Serviço WhatsApp não inicializado'
                });
            }

            const result = await whatsappService.restart();
            res.json(result);
        } catch (error) {
            console.error('Erro ao reiniciar WhatsApp:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erro ao reiniciar'
            });
        }
    });

    // Forçar novo QR Code (limpa sessão)
    router.post('/force-new-qr', async (req, res) => {
        try {
            const whatsappService = getWhatsappService();
            if (!whatsappService) {
                return res.status(400).json({
                    success: false,
                    error: 'Serviço WhatsApp não inicializado'
                });
            }

            const result = await whatsappService.forceNewQR();
            res.json(result);
        } catch (error) {
            console.error('Erro ao forçar novo QR:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erro ao gerar novo QR'
            });
        }
    });

    // Destruir cliente WhatsApp
    router.post('/destroy', async (req, res) => {
        try {
            const whatsappService = getWhatsappService();
            if (!whatsappService) {
                return res.status(400).json({
                    success: false,
                    error: 'Serviço WhatsApp não inicializado'
                });
            }

            const result = await whatsappService.destroy();
            res.json(result);
        } catch (error) {
            console.error('Erro ao destruir WhatsApp:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erro ao destruir cliente'
            });
        }
    });

    // Listar grupos do WhatsApp
    router.get('/groups', async (req, res) => {
        try {
            const whatsappService = getWhatsappService();
            if (!whatsappService) {
                return res.status(400).json({
                    success: false,
                    error: 'Serviço WhatsApp não inicializado'
                });
            }

            if (!whatsappService.isConnected) {
                return res.status(400).json({
                    success: false,
                    error: 'WhatsApp não está conectado'
                });
            }

            const groups = await whatsappService.listGroups();
            res.json({ success: true, groups });
        } catch (error) {
            console.error('Erro ao listar grupos:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erro ao listar grupos'
            });
        }
    });

    return router;
}

// Rota para status do robô (separada)
export function createRobotRoutes(getRobotEnabled, setRobotEnabled) {
    const robotRouter = express.Router();

    // Status do robô
    robotRouter.get('/status', (req, res) => {
        res.json({
            success: true,
            enabled: getRobotEnabled()
        });
    });

    // Toggle robô
    robotRouter.post('/toggle', (req, res) => {
        try {
            const { enabled } = req.body;
            setRobotEnabled(enabled === true);

            console.log(`🤖 Robô ${getRobotEnabled() ? 'LIGADO' : 'DESLIGADO'}`);

            res.json({
                success: true,
                enabled: getRobotEnabled(),
                message: getRobotEnabled() ? 'Robô ativado' : 'Robô desativado'
            });
        } catch (error) {
            console.error('Erro ao alternar robô:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao alternar status do robô'
            });
        }
    });

    return robotRouter;
}
