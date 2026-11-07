"""
Makes the Eye Tracker's background music: original chiptune-style loops, written
by this script for EyeQuest, so the project owns them and they're free to share.

Run from the project folder (needs Python with numpy, and ffmpeg for the MP3s):
    python tools/make_music.py

Each track is a seamless loop: chords, a bass line, an arpeggio, a melody made from
the chord notes, and drums. A seed per track keeps the same song every time it's made.
The hard stages reuse their normal song, faster and with busier drums.
"""

import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

RATE = 32000
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "music")

SCALES = {"major": [0, 2, 4, 5, 7, 9, 11], "minor": [0, 2, 3, 5, 7, 8, 10], "dorian": [0, 2, 3, 5, 7, 9, 10]}

# name: (seed, tempo, key as a MIDI note, scale, chords as scale steps, lead sound, mood)
TRACKS = {
    "look_and_score": (11, 120, 60, "major", [0, 4, 5, 3], "square", "bright"),
    "pop_the_balloon": (23, 128, 65, "major", [0, 5, 3, 4], "pluck", "bouncy"),
    "tetris": (37, 136, 57, "minor", [0, 5, 2, 6], "square", "drive"),
    "dont_look_at_red": (41, 112, 52, "minor", [0, 0, 5, 4], "saw", "tense"),
    "subway_runner": (53, 150, 62, "dorian", [0, 6, 3, 4], "square", "drive"),
    "gameshow": (67, 104, 63, "major", [0, 5, 1, 4], "pluck", "swing"),
}
HARD = {"look_and_score_hard": "look_and_score", "pop_the_balloon_hard": "pop_the_balloon",
        "dont_look_at_red_hard": "dont_look_at_red"}
BARS = 32  # long loops, so the repeat is rarely noticed


def freq(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def tone(kind, f, length, rng_phase=0.0):
    t = np.arange(int(length * RATE)) / RATE
    phase = (f * t + rng_phase) % 1.0
    if kind == "square":
        wave_ = np.where(phase < 0.5, 1.0, -1.0) * 0.6
    elif kind == "saw":
        wave_ = 2 * phase - 1
    elif kind == "triangle":
        wave_ = 1 - 4 * np.abs(phase - 0.5)
    else:  # pluck: a soft square that fades quickly
        wave_ = np.where(phase < 0.3, 1.0, -1.0) * np.exp(-t * 9)
    attack = np.minimum(t / 0.005, 1.0)
    release = np.minimum((length - t) / 0.03, 1.0).clip(0, 1)
    return wave_ * attack * release


def noise(length, decay, seed):
    rng = np.random.default_rng(seed)
    t = np.arange(int(length * RATE)) / RATE
    return rng.uniform(-1, 1, len(t)) * np.exp(-t * decay)


def kick(length=0.25):
    t = np.arange(int(length * RATE)) / RATE
    return np.sin(2 * np.pi * (55 * t + 90 * (1 - np.exp(-t * 30)) / 30)) * np.exp(-t * 14)


def place(track, sound, start):
    i = int(start * RATE) % len(track)
    end = i + len(sound)
    if end <= len(track):
        track[i:end] += sound
    else:  # wrap the tail round to the start: a seamless loop
        cut = len(track) - i
        track[i:] += sound[:cut]
        track[:len(sound) - cut] += sound[cut:]


def make(seed, tempo, key, scale_name, chords, lead, mood, hard=False):
    rng = np.random.default_rng(seed)
    if hard:
        tempo = int(tempo * 1.2)
    beat = 60 / tempo
    bar = 4 * beat
    total = BARS * bar
    scale = SCALES[scale_name]
    note_of = lambda step, octave=0: key + 12 * (octave + step // 7) + scale[step % 7]

    parts = {name: np.zeros(int(round(total * RATE))) for name in ("bass", "arp", "lead", "pad", "drums")}
    swing = 0.18 if mood == "swing" else 0.0

    # A melody motif for the A section and one for the B section, reused with changes.
    def motif():
        rhythms = [[1, 0.5, 0.5, 1, 1], [0.5, 0.5, 1, 0.5, 0.5, 1], [1.5, 0.5, 1, 1], [0.5] * 8]
        rhythm = rhythms[rng.integers(0, len(rhythms))]
        moves = rng.integers(-2, 3, size=len(rhythm))
        return list(rhythm), list(moves)
    motifs = [motif(), motif()]

    for b in range(BARS):
        section = (b // 8) % 2
        chord = chords[b % len(chords)] + (1 if section and b % 4 == 3 else 0)
        start = b * bar
        triad = [chord, chord + 2, chord + 4]
        # Pad: a soft chord held through the bar.
        for step in triad:
            place(parts["pad"], tone("triangle", freq(note_of(step, 0)), bar) * 0.12, start)
        # Bass.
        pattern = [0, 0, 2, 0] if mood == "swing" else ([0, 0.75, 1.5, 2, 2.75, 3.5] if mood == "drive" else [0, 1, 2, 3])
        for k, at in enumerate(pattern):
            step = chord if k % 3 else chord + (4 if k % 2 else 0)
            place(parts["bass"], tone("triangle", freq(note_of(step, -2)), beat * 0.45) * 0.55, start + at * beat)
        # Arpeggio in sixteenths (eighths when calm).
        div = 4 if mood in ("drive", "bouncy", "tense") else 2
        for i in range(4 * div):
            step = triad[[0, 1, 2, 1][i % 4]] + (7 if i % 8 >= 4 else 0)
            at = i * beat / div + (swing * beat / div if i % 2 else 0)
            place(parts["arp"], tone("pluck", freq(note_of(step, 1)), beat / div * 0.9) * 0.16, start + at)
        # Lead melody: the section's motif, starting on a chord note, resting every 4th bar.
        if b % 4 != 3 or hard:
            rhythm, moves = motifs[section]
            step, at = triad[rng.integers(0, 3)] + 7, 0.0
            for length, move in zip(rhythm, moves):
                if at >= 4:
                    break
                if rng.random() > 0.15:
                    place(parts["lead"], tone(lead, freq(note_of(step, 1)), beat * length * 0.85) * 0.22, start + at * beat)
                step = int(np.clip(step + move, 5, 16))
                at += length
        # Drums.
        for i in range(8):
            at = start + i * beat / 2 + (swing * beat / 2 if i % 2 else 0)
            if i % 4 == 0 or (mood == "drive" and i == 5) or (hard and i == 3):
                place(parts["drums"], kick() * 0.7, at)
            if i % 4 == 2:
                place(parts["drums"], noise(0.18, 22, seed + b * 8 + i) * 0.35, at)
            place(parts["drums"], noise(0.05, 70, seed + 500 + b * 8 + i) * (0.12 if i % 2 else 0.07), at)
            if hard or mood == "drive":
                place(parts["drums"], noise(0.04, 90, seed + 900 + b * 8 + i) * 0.06, at + beat / 4)

    mix = sum(parts.values())
    # Gentle low-pass to soften the chip sounds.
    smooth = np.convolve(mix, np.ones(3) / 3, mode="same")
    return smooth / np.abs(smooth).max() * 0.8


def save_mp3(samples, name):
    pcm = (np.clip(samples, -1, 1) * 32767).astype(np.int16)
    with tempfile.TemporaryDirectory() as folder:
        path = os.path.join(folder, "track.wav")
        with wave.open(path, "wb") as out:
            out.setnchannels(1)
            out.setsampwidth(2)
            out.setframerate(RATE)
            out.writeframes(pcm.tobytes())
        subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", path,
                        "-af", "loudnorm=I=-19:TP=-1.5", "-ar", "44100", "-ac", "1", "-b:a", "80k",
                        "-map_metadata", "-1", os.path.join(OUT, f"{name}.mp3")], check=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, settings in TRACKS.items():
        save_mp3(make(*settings), name)
        print("made", name)
    for name, base in HARD.items():
        save_mp3(make(*TRACKS[base], hard=True), name)
        print("made", name)


if __name__ == "__main__":
    sys.exit(main())
