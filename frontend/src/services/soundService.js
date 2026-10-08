/**
 * soundService.js
 * Servicio de alarma acústica de alta penetración para la plataforma CowIA / CollarNet.
 * Emite sonido intermitente (buzzer piezoeléctrico de 2.2 - 2.6 kHz) cuando un animal
 * cruza el margen de advertencia (3 metros) o sale de su potrero asignado.
 * 
 * Implementa motor híbrido (Web Audio API + fallback HTML5 Audio con audio/wav sintetizado)
 * y captura de gestos en fase 'capture' para evitar que librerías como Leaflet bloqueen el audio.
 */

class SoundService {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.currentType = null; // 'ADVERTENCIA' | 'FUERA' | null
    this.intervalId = null;
    this.isMuted = false;
    this.subscribers = new Set();
    this.unlocked = false;
    this.needsUserGesture = false;
    this._cachedWavUri = null;

    // Cargar preferencia persistente de mute
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.isMuted = window.localStorage.getItem('collarnet_alarm_muted') === 'true';
      }
    } catch (_) {}

    // Desbloqueo universal en fase CAPTURE para traspasar el stopPropagation de Leaflet
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlockContext();
      };

      ['click', 'keydown', 'touchstart', 'pointerdown', 'mousedown'].forEach(evt => {
        window.addEventListener(evt, unlockHandler, { capture: true, passive: true });
        document.addEventListener(evt, unlockHandler, { capture: true, passive: true });
      });
    }
  }

  initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    return this.audioCtx;
  }

  unlockContext() {
    const ctx = this.initContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.unlocked = true;
        this.needsUserGesture = false;
        this.notifySubscribers();
        console.log('[SoundService] 🔊 AudioContext desbloqueado y en ejecución.');
        if (this.isPlaying && !this.isMuted) {
          this.playBuzzerPulse(1500, 1900, 350, 0.90);
        }
      }).catch((err) => {
        console.warn('[SoundService] Error desbloqueando AudioContext:', err);
      });
    } else if (ctx.state === 'running') {
      this.unlocked = true;
      this.needsUserGesture = false;
      this.notifySubscribers();
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.getState());
    return () => this.subscribers.delete(callback);
  }

  getState() {
    const ctx = this.audioCtx;
    const isSuspended = Boolean(!ctx || ctx.state === 'suspended');
    return {
      isPlaying: this.isPlaying,
      currentType: this.currentType,
      isMuted: this.isMuted,
      unlocked: this.unlocked && !isSuspended,
      needsUserGesture: this.isPlaying && isSuspended && !this.isMuted
    };
  }

  notifySubscribers() {
    const state = this.getState();
    this.subscribers.forEach(cb => {
      try { cb(state); } catch (e) { console.error('[SoundService]', e); }
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('collarnet_alarm_muted', String(this.isMuted));
      }
    } catch (_) {}

    this.unlockContext();

    if (!this.isMuted) {
      this.playTestBeep();
    }

    this.notifySubscribers();
    return this.isMuted;
  }

  setMuted(muted) {
    if (this.isMuted === Boolean(muted)) return;
    this.isMuted = Boolean(muted);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('collarnet_alarm_muted', String(this.isMuted));
      }
    } catch (_) {}

    this.unlockContext();
    if (!this.isMuted) {
      this.playTestBeep();
    }
    this.notifySubscribers();
  }

  getIsMuted() {
    return this.isMuted;
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Genera un audio WAV PCM 16-bit estéreo en Base64 para reproducción HTML5 garantizada
   */
  _generateBeepWavUri(freq1 = 2200, freq2 = 2600, durationMs = 320) {
    try {
      const sampleRate = 22050;
      const numSamples = Math.floor(sampleRate * (durationMs / 1000));
      const dataSize = numSamples * 2;
      const buffer = new Uint8Array(44 + dataSize);
      const view = new DataView(buffer.buffer);

      const writeString = (offset, str) => {
        for (let i = 0; i < str.length; i++) buffer[offset + i] = str.charCodeAt(i);
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, dataSize, true);

      const attack = Math.floor(sampleRate * 0.02);
      const decay = Math.floor(sampleRate * 0.03);

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let env = 1.0;
        if (i < attack) env = i / attack;
        else if (i > numSamples - decay) env = (numSamples - i) / decay;

        const s1 = Math.sin(2 * Math.PI * freq1 * t);
        const s2 = Math.sin(2 * Math.PI * freq2 * t) * 0.5;
        const sample = Math.max(-1, Math.min(1, (s1 + s2) * env * 0.9));
        view.setInt16(44 + i * 2, Math.floor(sample * 32767), true);
      }

      let binary = '';
      const len = buffer.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(buffer[i]);
      }
      return 'data:audio/wav;base64,' + btoa(binary);
    } catch (_) {
      return null;
    }
  }

  _playHtml5Beep(freq1, freq2, durationMs) {
    try {
      if (!this._cachedWavUri) {
        this._cachedWavUri = this._generateBeepWavUri(freq1, freq2, durationMs);
      }
      if (this._cachedWavUri) {
        const audio = new Audio(this._cachedWavUri);
        audio.volume = 0.95;
        audio.play().catch(() => {});
      }
    } catch (_) {}
  }

  /**
   * Ejecuta el sintetizador Web Audio API si está activo
   */
  _executeWebAudioBuzzer(freq1, freq2, durationMs, volume) {
    const ctx = this.audioCtx;
    if (!ctx || ctx.state !== 'running') return false;

    try {
      const now = ctx.currentTime;
      const durSec = durationMs / 1000;
      const attack = 0.015;
      const decay = 0.025;

      // 1. Tono portador principal (onda triangular rica en armónicos pero agradable)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq1, now);

      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(volume * 0.75, now + attack);
      gain1.gain.setValueAtTime(volume * 0.75, now + Math.max(attack, durSec - decay));
      gain1.gain.linearRampToValueAtTime(0.0001, now + durSec);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      // 2. Armónico agudo brillante (onda senoidal complementaria)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq2, now);

      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.linearRampToValueAtTime(volume * 0.40, now + attack);
      gain2.gain.setValueAtTime(volume * 0.40, now + Math.max(attack, durSec - decay));
      gain2.gain.linearRampToValueAtTime(0.0001, now + durSec);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + durSec + 0.02);
      osc2.stop(now + durSec + 0.02);
      return true;
    } catch (e) {
      console.warn('[SoundService] Error en Web Audio API:', e);
      return false;
    }
  }

  /**
   * Genera un pulso acústico piezoeléctrico dual (1500Hz + 1900Hz)
   * Utiliza Web Audio API de forma primaria y fallback HTML5 Audio automático.
   */
  playBuzzerPulse(freq1 = 1500, freq2 = 1900, durationMs = 350, volume = 0.90) {
    if (this.isMuted) return;
    const ctx = this.initContext();

    if (ctx && ctx.state === 'running') {
      this._executeWebAudioBuzzer(freq1, freq2, durationMs, volume);
      return;
    }

    // Si AudioContext está en 'suspended' (bloqueo autoplay de navegador):
    this.needsUserGesture = true;
    this.notifySubscribers();
    this.unlockContext();

    // Intentar disparar vía HTML5 Audio como fallback inmediato
    this._playHtml5Beep(freq1, freq2, durationMs);
  }

  /**
   * Doble pitido de prueba que desbloquea y confirma sonoridad inmediatamente
   */
  playTestBeep() {
    const ctx = this.initContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    this.unlocked = true;
    this.needsUserGesture = false;
    this.isMuted = false;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('collarnet_alarm_muted', 'false');
      }
    } catch (_) {}
    this.notifySubscribers();

    console.log('[SoundService] 🔔 Ejecutando pitido de prueba en altavoces...');
    this.playBuzzerPulse(1500, 1900, 260, 0.95);
    setTimeout(() => {
      this.playBuzzerPulse(1900, 2400, 300, 0.95);
    }, 280);
  }

  /**
   * Inicia la alarma intermitente en la web.
   * type: 'ADVERTENCIA' (margen de 3m de potrero) | 'FUERA' (escape de hato/finca)
   */
  startAlarm(type = 'ADVERTENCIA', metadata = {}) {
    if (this.isPlaying && this.currentType === type) {
      return;
    }

    console.log(`[SoundService] 🚨 Iniciando alarma acústica intermitente (${type}).`);
    this.stopAlarm(false);

    this.isPlaying = true;
    this.currentType = type;
    this.unlockContext();

    if (type === 'FUERA') {
      // 🚨 ESCAPE MAYOR DE HATO / FINCA (Alerta Crítica):
      // Cadencia rápida de doble pulso alternating 2400Hz / 1800Hz (180ms BEEP / 180ms Silencio)
      let step = 0;
      const tick = () => {
        if (!this.isPlaying) return;
        if (!this.isMuted) {
          if (step % 2 === 0) {
            this.playBuzzerPulse(2200, 2700, 180, 0.95);
          } else {
            this.playBuzzerPulse(1700, 2200, 180, 0.90);
          }
        }
        step++;
      };

      tick();
      this.intervalId = setInterval(tick, 360);

    } else {
      // ⚠️ ADVERTENCIA PREVENTIVA (Margen de 3m de potrero o infracción de rotación):
      // Pitido intermitente robusto, claro y perfectamente perceptible:
      // Pulso activo de 350ms seguido de 350ms de silencio (ciclo rítmico cada 700ms)
      const tick = () => {
        if (!this.isPlaying) return;
        if (!this.isMuted) {
          this.playBuzzerPulse(1500, 1900, 350, 0.90);
        }
      };

      tick();
      this.intervalId = setInterval(tick, 700);
    }

    this.notifySubscribers();
  }

  /**
   * Detiene la alarma acústica inmediatamente
   */
  stopAlarm(notify = true) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const wasPlaying = this.isPlaying;
    this.isPlaying = false;
    this.currentType = null;
    this.needsUserGesture = false;

    if (notify && wasPlaying) {
      console.log('[SoundService] 🟢 Alarma acústica apagada (Animal en zona segura).');
      this.notifySubscribers();
    }
  }
}

// Singleton global
export const soundService = new SoundService();
export default soundService;
