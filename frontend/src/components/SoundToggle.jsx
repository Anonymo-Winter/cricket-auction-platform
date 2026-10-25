import { Volume2, VolumeX } from "lucide-react";

export default function SoundToggle({ sound, className = "" }) {
    return (
        <button
            type="button"
            onClick={sound.toggle}
            title={sound.enabled ? "Turn auction sounds off" : "Turn auction sounds on"}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                sound.enabled ? "border-gold-400 bg-gold-400/20 text-gold-600" : "border-gray-300 bg-white/70 text-gray-600 hover:bg-white"
            } ${className}`}
        >
            {sound.enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {sound.enabled ? "Sound on" : "Sound off"}
        </button>
    );
}
