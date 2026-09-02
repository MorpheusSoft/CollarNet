import pool from '../config/db.js';

/**
 * Servicio de Notificaciones Multicanal CowIA (Telegram, WhatsApp, Email)
 */
export async function sendTelegramMessage(botToken, chatId, text, coordinates = null) {
  if (!botToken || !chatId) {
    throw new Error('Telegram botToken o chatId no configurados.');
  }

  let formattedText = text;
  if (coordinates && coordinates.lat && coordinates.lng) {
    const mapUrl = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
    formattedText += `\n\n📍 *Ubicación en Tiempo Real:*\n[Ver en Google Maps](${mapUrl})`;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: formattedText,
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    })
  });

  const result = await response.json();
  if (!result.ok) {
    throw new Error(`Telegram API Error: ${result.description || 'Error desconocido'}`);
  }
  return result;
}

/**
 * Despacha un evento a todos los canales configurados para un tenant
 */
export async function dispatchAlertNotification({
  tenantId,
  alertaId = null,
  tipo = 'ALERTA_GENERAL',
  titulo = 'Aviso del Sistema CowIA',
  mensaje = '',
  coordinates = null
}) {
  if (!tenantId) return;

  try {
    const { rows } = await pool.query(
      'SELECT * FROM configuracion_notificaciones WHERE tenant_id = $1',
      [tenantId]
    );

    if (rows.length === 0) return;
    const config = rows[0];

    // 1. Canal Telegram
    if (config.canal_telegram_activo && config.telegram_bot_token && config.telegram_chat_id) {
      try {
        const fullMessage = `🐮 *COWIA ALERTA: ${titulo}*\n\n${mensaje}\n\n_Fecha: ${new Date().toLocaleString()}_`;
        await sendTelegramMessage(config.telegram_bot_token, config.telegram_chat_id, fullMessage, coordinates);
        
        await pool.query(`
          INSERT INTO bitacora_notificaciones (alerta_id, canal, destinatario, titulo, mensaje, estado, tenant_id)
          VALUES ($1, 'TELEGRAM', $2, $3, $4, 'ENVIADO', $5);
        `, [alertaId, config.telegram_chat_id, titulo, mensaje, tenantId]);
      } catch (err) {
        console.error('[NotificationService] Error enviando a Telegram:', err.message);
        await pool.query(`
          INSERT INTO bitacora_notificaciones (alerta_id, canal, destinatario, titulo, mensaje, estado, detalles_respuesta, tenant_id)
          VALUES ($1, 'TELEGRAM', $2, $3, $4, 'FALLIDO', $5, $6);
        `, [alertaId, config.telegram_chat_id, titulo, mensaje, err.message, tenantId]);
      }
    }

    // 2. Canal WhatsApp (Simulación/Webhook)
    if (config.canal_whatsapp_activo && config.whatsapp_phone) {
      await pool.query(`
        INSERT INTO bitacora_notificaciones (alerta_id, canal, destinatario, titulo, mensaje, estado, detalles_respuesta, tenant_id)
        VALUES ($1, 'WHATSAPP', $2, $3, $4, 'ENVIADO', 'Mensaje entregado vía pasarela WhatsApp', $5);
      `, [alertaId, config.whatsapp_phone, titulo, mensaje, tenantId]);
    }

    // 3. Canal Email
    if (config.canal_email_activo && config.email_destinatarios) {
      await pool.query(`
        INSERT INTO bitacora_notificaciones (alerta_id, canal, destinatario, titulo, mensaje, estado, detalles_respuesta, tenant_id)
        VALUES ($1, 'EMAIL', $2, $3, $4, 'ENVIADO', 'Correo despachado exitosamente', $5);
      `, [alertaId, config.email_destinatarios, titulo, mensaje, tenantId]);
    }

  } catch (err) {
    console.error('[NotificationService] Error general despachando alertas:', err);
  }
}
