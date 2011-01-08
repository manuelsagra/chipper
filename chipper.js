/*
Copyright (c) 2011, Manuel Sagra de Diego <manuelsagra@gmail.com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:
1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.
3. Neither the name of copyright holders nor the names of its
   contributors may be used to endorse or promote products derived
   from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL COPYRIGHT HOLDERS OR CONTRIBUTORS
BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
*/

// Memoria RAM
Memory = {
	_ram: [],
	_fonts: 
	[
		0xf0, 0x90, 0x90, 0x90, 0xf0,	// 0
		0x20, 0x60, 0x20, 0x20, 0x70,	// 1
		0xf0, 0x10, 0xf0, 0x80, 0xf0,	// 2
		0xf0, 0x10, 0xf0, 0x10 ,0xf0,	// 3
		0x90, 0x90, 0xf0, 0x10, 0x10,	// 4
		0xf0, 0x80, 0xf0, 0x10, 0xf0,	// 5
		0xf0, 0x80, 0xf0, 0x90, 0xf0,	// 6
		0xf0, 0x10, 0x20, 0x40, 0x40,	// 7
		0xf0, 0x90, 0xf0, 0x90 ,0xf0,	// 8
		0xf0, 0x90, 0xf0, 0x10, 0xf0,	// 9
		0xf0, 0x90, 0xf0, 0x90, 0x90,	// A
		0xe0, 0x90, 0xe0, 0x90, 0xe0,	// B
		0xf0, 0x80, 0x80, 0x80, 0xf0,	// C
		0xe0, 0x90, 0x90, 0x90, 0xe0,	// D
		0xf0, 0x80, 0xf0, 0x80, 0xf0,	// E
		0xf0, 0x80, 0xf0, 0x80, 0x80 	// F
	],
	
	// Se inicializa la memoria
	reset: function () {
		for (var i=0;i<0x1000;i++) 			// 4KB de memoria
			Memory._ram[i]=0;
			
		for (var i=0;i<Memory._fonts.length;i++) 	// Fuentes
			Memory._ram[i]=Memory._fonts[i];
	}, 
	
	// Se carga un array en la memoria (a partir de 0x200)
	load: function (romdata) {
		for (var i=0;i<romdata.length;i++)
			Memory._ram[i+0x200]=romdata[i];	
	},
	
	// Devuelve un byte de una dirección de la memoria
	read8: function (dir) {
		return Memory._ram[dir];	
	},
	
	// Devuelve dos bytes de una dirección de memoria
	read16: function (dir) {
		return (Memory._ram[dir]<<8)+Memory._ram[dir+1];		
	},
	
	// Escribe un byte en una dirección de memoria
	write8: function (dir, val) {
		Memory._ram[dir]=val;
	},
	
	// Escribe dos bytes en una dirección de memoria
	write16: function (dir, val) {
		Memory._ram[dir]=(val&0xff00)>>8;
		Memory._ram[dir+1]=val&0xff;
	}
};
	
// Simulación de la pantalla	
Screen = {		
	_canvas: {},			// Se pinta sobre un "lienzo" HTML5
	_canvasctx: {},			// El contexto del lienzo
	_canvaswidth: 0,		// Debe ser un múltiplo de 128
	_canvasheight: 0,		// Debe ser un múltiplo de 64
	_pixelsize: 0,			// Para ver lo grandes que tienen que ser los píxeles
	_mode: 1,			// 1: 64x32, 2: 128x64
	_vram: [],			// Memoria de vídeo
	_vramsize: 0,			// Tamaño de la memoria de vídeo	
	_changes: false,		// Indica si ha habido cambios en un frame
	_patternimg: 'img/pixel.png',	// Imagen de fondo para los píxeles	
	_pattern: null, 
	
	// Se inicializa la pantalla
	init: function () {
		var canvastmp=$("#chipperscreen");
		if (!(document.createElement('canvas').getContext('2d'))) {
			alert("Error al inicializar pantalla");
			return;
		}
		Screen._canvas=canvastmp[0];	
		Screen._canvasctx=Screen._canvas.getContext('2d');	
		Screen.setmode(1);
		if (Screen._pattern==null) {
			var img=new Image();
			img.src=Screen._patternimg;
			img.onload = function(){
				var ptrn=Screen._canvasctx.createPattern(img,'repeat');
				Screen._pattern=ptrn;
			}
		}	
	},
	
	// Se borra la pantalla
	clear: function () {
		Screen._canvas.width=Screen._canvas.width;	// Algo tan simple como esto inicializa el canvas		
		for (var i=0;i<Screen._vramsize;i++)		// Vaciamos la VRAM
			Screen._vram[i]=0;	
	},
	
	// Se pinta un sprite
	drawsprite: function (x,y,n) {
		// Si n==0, es un sprite de 16x16, si no, uno de 8xn
		if (n==0) {
			n=16;
			w=16;
		} else {
			w=8;
		}
		CPU._reg.v[0xf]=0;
		
		for (var i=0;i<n;i++) {				// Pintamos línea a línea
			var l=(w==8)?Memory.read8(CPU._reg.i+i).toString(2):Memory.read16(CPU._reg.i+2*i).toString(2);	
			while (l.length<w)			// Cogemos la línea y la pasamos a binario,
				l="0"+l;			// añadiendo tantos ceros a la izquierda como sea necesario
			for (j=0;j<w;j++) { 
				if (l.charAt(j)=="1") {		// Pintamos pixel a pixel con XOR
					var vx=x+j;		// Coordenada x virtual en la que tenemos que pintar
					var vy=y+i;		// Coordenada y virtual en la que tenemos que pintar
					
					if (vx>((1<<(5+Screen._mode))-1))	vx-=((1<<(5+Screen._mode))-1);	// Si nos salimos de la pantalla,
					if (vy>((1<<(4+Screen._mode))-1))	vx-=((1<<(4+Screen._mode))-1);	// pintamos al otro lado
					
					var posvram=(1<<(5+Screen._mode))*vy+vx;				// Posición en la vram en la que pintamos			
					Screen._vram[posvram]^=1;						// Pintamos con XOR										
					if (!Screen._vram[posvram]) CPU._reg.v[0xf]=1;				// Si ha habido colisión, ponemos el flag a 1
					
					Screen._changes=true;
				}
			}
		}
	},
	
	// Se hace scroll en el eje x (SCHIP)
	scrollx: function (x) {
		var lines=x*Screen._mode/2;			// En baja resolución se mueven la mitad de líneas
		var newvram=[];

		// Creamos una nueva vram vacía
		for (var i=0;i<Screen._vramsize;i++)
			newvram[i]=0;

		// Hacemos el scroll
		var rx=1<<(5+Screen._mode);
		var ry=1<<(4+Screen._mode);
		for (var y=0;y<ry;y++) {
			var skip=y<<(5+Screen._mode);
			if (lines>0) {
				for (var x=lines;x<rx;x++)
					newvram[x-lines+skip]=Screen._vram[x+skip];
			} else {
				for (var x=0;x<(rx+lines);x++)
					newvram[x+skip]=Screen._vram[x-lines+skip];	
			}
		}

		// Guardamos la memoria	
		Screen._vram=newvram.slice();	     
		Screen._changes=true;
	},
	
	// Se hace scroll en el eje y hacia abajo (SCHIP)
	scrolly: function (y) {
		var lines=Math.floor(y*Screen._mode/2);		// En baja resolución se mueven la mitad de líneas
		var newvram=[];

		// Creamos una nueva vram vacía
		for (var i=0;i<Screen._vramsize;i++)
		     newvram[i]=0;
     
		// Hacemos el scroll
		var skip=lines<<(5+Screen._mode);
		for (var i=0;i<(Screen._vramsize-skip);i++)
			newvram[i+skip]=Screen._vram[i];

		// Guardamos la memoria	
		Screen._vram=newvram.slice();
		Screen._changes=true;
	},
	
	// Si ha habido cambios, se pinta el frame en el canvas
	render: function () {
		if (Screen._changes) {
			Screen._canvas.width=Screen._canvas.width;
			// Miramos si se ya ha cargado la imagen
			if (Screen._pattern!=null)  	
				Screen._canvasctx.fillStyle=Screen._pattern;
			else 
				Screen._canvasctx.fillStyle='#000';	

			for (var i=0;i<Screen._vramsize;i++) {
				if (Screen._vram[i]) {	// Pintamos un pixel
					var y=i>>(5+Screen._mode);
					var x=i%(1<<(5+Screen._mode));
					Screen._canvasctx.fillRect(x*Screen._pixelsize,y*Screen._pixelsize,Screen._pixelsize,Screen._pixelsize);
				}
			}
			Screen._changes=false;
		}
	},
	
	// Se cambia el modo de pantallaZZ
	setmode: function (m) {
		Screen._mode=m;		
		Screen._pixelsize=Screen._canvas.width>>(6+(m-1));
		// Para simplificar las cosas, usamos un byte por cada pixel, aunque la información sea de un bit
		Screen._vramsize=1<<(11+(2*(m-1)));
		Screen.clear();	
	}
};

// Emulación del sonido
Sound = {
	_audio: {},		// Usamos HTML5
	
	// Coge el elemento de la página
	init: function () {
		if (!(document.createElement('audio').canPlayType)) {
			alert("Error al inicializar el sonido");
			return;
		}	
		var audiotmp=$("#chipperaudio");
		Sound._audio=audiotmp[0];
	},
	
	// Reproduce el sonido
	play: function () {
		if (Sound._audio.currentTime>2000)
			Sound._audio.currentTime=0;	
		Sound._audio.play();
	},
	
	// Detiene el sonido
	stop: function () {
	 	Sound._audio.pause();
	}
};
	
// Emulación del teclado hexadecimal (botones y también 1234/QWER/ASDF/ZXCV)
Keyboard = {
	_waiting: false,	// Indica si estamos esperando pulsación
	_waitreg: 0,		// Indica el registro que se cargará al esperar
	_keys: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],		// Matriz de teclado

	// Mira a ver si se ha pulsado la letra
	check: function (k) {
		return (Keyboard._keys[k]==1);	
	},	
	
	// Pone el modo de espera del teclado
	wait: function (r) {
		Keyboard._waiting=true;
		Keyboard._waitreg=r;
	},
	
	// Comprueba el buffer para ver si se ha presionado alguna tecla	
	checkwait: function () {
		for (var i=0;i<16;i++) {
			if (Keyboard._keys[i]!=0) {
				CPU._reg.v[Keyboard._waitreg]=i;
				Keyboard._waiting=false;
				break;
			}
		}	
	},
		
	// Inicializa el teclado
	init: function () {
		for (var i=0;i<16;i++) {		
			$('#b'+i.toString(16)).mousedown(function () {
				Keyboard._keys[parseInt(this.id.charAt(1),16)]=1;
			});
			$('#b'+i.toString(16)).mouseup(function () {
				Keyboard._keys[parseInt(this.id.charAt(1),16)]=0;
			});
		}
		$(document).keydown(Keyboard.keydown);
		$(document).keyup(Keyboard.keyup);
	},
	
	// Comprueba las pulsaciones del teclado
	keydown: function (e) {
		switch(e.keyCode)
		{
			case 88: Keyboard._keys[0x0]=1; break;	// Tecla x
			case 49: Keyboard._keys[0x1]=1; break;	// Tecla 1
			case 50: Keyboard._keys[0x2]=1; break;	// Tecla 2
			case 51: Keyboard._keys[0x3]=1; break;	// Tecla 3
			case 81: Keyboard._keys[0x4]=1; break;	// Tecla q
			case 87: Keyboard._keys[0x5]=1; break;	// Tecla w
			case 69: Keyboard._keys[0x6]=1; break;	// Tecla e
			case 65: Keyboard._keys[0x7]=1; break;	// Tecla a
			case 83: Keyboard._keys[0x8]=1; break;	// Tecla s
			case 68: Keyboard._keys[0x9]=1; break;	// Tecla d
			case 90: Keyboard._keys[0xa]=1; break;	// Tecla z
			case 67: Keyboard._keys[0xb]=1; break;	// Tecla c
			case 52: Keyboard._keys[0xc]=1; break;	// Tecla 4
			case 82: Keyboard._keys[0xd]=1; break;	// Tecla r
			case 70: Keyboard._keys[0xe]=1; break;	// Tecla f
			case 86: Keyboard._keys[0xf]=1; break;	// Tecla v
		}	
	},
	
	// Comprueba las teclas levantadas
	keyup: function (e) {
		switch(e.keyCode)
		{
			case 88: Keyboard._keys[0x0]=0; break;	// Tecla x
			case 49: Keyboard._keys[0x1]=0; break;	// Tecla 1
			case 50: Keyboard._keys[0x2]=0; break;	// Tecla 2
			case 51: Keyboard._keys[0x3]=0; break;	// Tecla 3
			case 81: Keyboard._keys[0x4]=0; break;	// Tecla q
			case 87: Keyboard._keys[0x5]=0; break;	// Tecla w
			case 69: Keyboard._keys[0x6]=0; break;	// Tecla e
			case 65: Keyboard._keys[0x7]=0; break;	// Tecla a
			case 83: Keyboard._keys[0x8]=0; break;	// Tecla s
			case 68: Keyboard._keys[0x9]=0; break;	// Tecla d
			case 90: Keyboard._keys[0xa]=0; break;	// Tecla z
			case 67: Keyboard._keys[0xb]=0; break;	// Tecla c
			case 52: Keyboard._keys[0xc]=0; break;	// Tecla 4
			case 82: Keyboard._keys[0xd]=0; break;	// Tecla r
			case 70: Keyboard._keys[0xe]=0; break;	// Tecla f
			case 86: Keyboard._keys[0xf]=0; break;	// Tecla v	
		}
	}
};

// Chip-8 no tiene una CPU "real", pero funciona de manera análoga
CPU = {
	// Registros
	_reg: {
		v: [],		// Registros V (16 de 8 bits)
		pc: 0x200,	// Contador de Programa (normalmente en 0x200, salvo programas de ETI 660)
		sp: 0x200,	// Puntero de pila. Lo ponemos en 0x200, pero el valor es arbitrario
		dt: 0,		// Delay Timer
		st: 0,		// Sound Timer
		i: 0,		// Registro para guardar posiciones de memoria
		exit: false	// Indica que hemos terminado la ejecución
	},
	
	// Se inicializan los registros
	reset: function () {
		for (var i=0;i<16;i++)	// Se inicializan los 16 registros V
			CPU._reg.v[i]=0;
		CPU._reg.pc=0x200;
		CPU._reg.sp=0x100;
		CPU._reg.dt=0;
		CPU._reg.st=0;
		CPU._reg.i=0;
		CPU._reg.exit=false;
	},
	
	// Ejecuta una instrucción
	exec: function () {
		var opcode=Memory.read16(CPU._reg.pc);
		
		var nnn=(opcode&0xfff);		// Últimos 12 bits
		
		var b1=(opcode&0xff00)>>8;	// Primer byte
		var b2=(opcode&0xff);		// Segundo byte
		
		var n1=(opcode&0xf000)>>12;	// Primer nibble
		var n2=(opcode&0xf00)>>8; 	// Segundo nibble
		var n3=(opcode&0xf0)>>4;	// Tercer nibble
		var n4=(opcode&0xf);		// Cuarto nibble
		
		switch (n1) {
			case 0:
				switch (b2) {
					case 0xc0:
					case 0xc1:
					case 0xc2:
					case 0xc3:
					case 0xc4:
					case 0xc5:
					case 0xc6:
					case 0xc7:
					case 0xc8:
					case 0xc9:
					case 0xca:
					case 0xcb:
					case 0xcc:
					case 0xcd:
					case 0xce:
					case 0xcf:	// SCD n (SCHIP)
						Screen.scrolly(n4);
						break;
					case 0xe0:	// CLS
						Screen.clear();
						break;
					case 0xee:	// RET
						CPU.ret();
						break;
					case 0xfb:	// SCR (SCHIP)
						Screen.scrollx(4);
						break;
					case 0xfc:	// SCL (SCHIP)
						Screen.scrollx(-4);
						break;
					case 0xfd:	// EXIT (SCHIP)
						CPU._reg.exit=true;
						break;
					case 0xfe:	// LOW (SCHIP)
						Screen.setmode(1);
						break;
					case 0xff:	// HIGH (SCHIP)
						Screen.setmode(2);
						break;
					default:
						//console.log('Opcode inválido');
						break;
				}
				break;
			case 0x1:		// JP nnn	
				CPU._reg.pc=nnn;
				return;
				break;
			case 0x2:		// CALL nnn
				CPU.call(nnn);	
				return;
				break;
			case 0x3:		// SE Vx, nn
				if (CPU._reg.v[n2]==b2) CPU._reg.pc+=2; 
				break;
			case 0x4:		// SNE Vx, nn
				if (CPU._reg.v[n2]!=b2) CPU._reg.pc+=2;
				break;
			case 0x5:		// SE Vx, Vy
				if (n4==0) {
					if (CPU._reg.v[n2]==CPU._reg.v[n3]) CPU._reg.pc+=2;	
				} else {
					//console.log('Opcode inválido');
				}
				break;
			case 0x6:		// LD Vx, nn
				CPU._reg.v[n2]=b2;
				break;
			case 0x7:		// ADD Vx, nn
				CPU._reg.v[n2]+=b2;
				CPU._reg.v[n2]&=0xff;
				break;
			case 0x8:
				switch (n4) {
					case 0x0:		// LD Vx, Vy
						CPU._reg.v[n2]=CPU._reg.v[n3];
						break;
					case 0x1:		// OR Vx, Vy
						CPU._reg.v[n2]|=CPU._reg.v[n3];
						break;
					case 0x2:		// AND Vx, Vy
						CPU._reg.v[n2]&=CPU._reg.v[n3];
						break;
					case 0x3:		// XOR Vx, Vy
						CPU._reg.v[n2]^=CPU._reg.v[n3];
						break;
					case 0x4:		// ADD Vx, Vy
						CPU._reg.v[n2]+=CPU._reg.v[n3];
						CPU._reg.v[0xf]=CPU._reg.v[n2]>>8;	// Acarreo
						CPU._reg.v[n2]&=0xff;
						break;
					case 0x5:		// SUB Vx, Vy
						CPU._reg.v[0xf]=(CPU._reg.v[n2]>=CPU._reg.v[n3])?1:0;
						CPU._reg.v[n2]-=CPU._reg.v[n3];						
						CPU._reg.v[n2]&=0xff;
						break;
					case 0x6:		// SHR Vx {,Vy}
						CPU._reg.v[0xf]=CPU._reg.v[n2]&0x1;
						CPU._reg.v[n2]>>=1;
						CPU._reg.v[n2]&=0xff;
						break;
					case 0x7:		// SUBN Vx, Vy
						CPU._reg.v[0xf]=(CPU._reg.v[n3]>=CPU._reg.v[n2])?1:0;
						CPU._reg.v[n2]=CPU._reg.v[n3]-CPU._reg.v[n2];						
						CPU._reg.v[n2]&=0xff;
						break;
					case 0xe:		// SHL Vx {,Vy}
						CPU._reg.v[0xf]=CPU._reg.v[n2]>>7;
						CPU._reg.v[n2]<<=1;
						CPU._reg.v[n2]&=0xff;
						break;
					default:
						//console.log('Opcode inválido');
						break;
				}
				break;
			case 0x9:		// SNE Vx, Vy
				if (n4==0) {
					if (CPU._reg.v[n2]!=CPU._reg.v[n3]) CPU._reg.pc+=2;	
				} else {
					//console.log('Opcode inválido');
				}
				break;
			case 0xa:		// LD I, nnn
				CPU._reg.i=nnn;
				break;
			case 0xb:		// JP V0, nnn
				CPU._reg_pc=nnn+CPU_reg.v[0];
				return;
				break;
			case 0xc:		// RND Vx, nn
				CPU._reg.v[n2]=Math.round(Math.random()*10000)&b2;
				break;
			case 0xd:		// DRW Vx, Vy, n
				Screen.drawsprite(CPU._reg.v[n2],CPU._reg.v[n3],n4);
				break;
			case 0xe:
				switch (b2) {
					case 0x9e:	// SKP Vx
						if (Keyboard.check(CPU._reg.v[n2])) CPU._reg.pc+=2; 
						break;
					case 0xa1:	// SKNP Vx
						if (!Keyboard.check(CPU._reg.v[n2])) CPU._reg.pc+=2; 
						break;
					default:
						//console.log('Opcode inválido');
						break;				
				}
				break;
			case 0xf:
				switch (b2) {
					case 0x07:	// LD Vx, DT
						CPU._reg.v[n2]=CPU._reg.dt;
						break;
					case 0x0a:	// LD Vx, K
						Keyboard.wait(n2);
						break;
					case 0x15:	// LD DT, Vx
						CPU._reg.dt=CPU._reg.v[n2];
						break;
					case 0x18: // LD ST, Vx
						CPU._reg.st=CPU._reg.v[n2];
						break;
					case 0x1e:	// ADD I, Vx
						CPU._reg.i+=CPU._reg.v[n2];
						CPU._reg.i&=0xfff;
						break;
					case 0x29:	// LD F, Vx
						CPU._reg.i=CPU._reg.v[n2]*5;
						break;
					case 0x33:	// LD B, Vx
						CPU.bcd(CPU._reg.v[n2]);
						break;
					case 0x55:	// LD [I], Vx
						for (var i=0;i<=n2;i++)
							Memory.write8(CPU._reg.i+i,CPU._reg.v[i]);
						break;
					case 0x65:	// LD Vx, [I]
						for (var i=0;i<=n2;i++)
							CPU._reg.v[i]=Memory.read8(CPU._reg.i+i);
						break;
					case 0x75:	// LD R, Vx
						//console.log('Opcode no emulado');
						break;
					case 0x85:	// LD Vx, R
						//console.log('Opcode no emulado');
						break;
					default:
						//console.log('Opcode inválido');
						break;	
				}
				break;	
		}		
		CPU._reg.pc+=2;
	},
	
	//Instrucciones de carga
	bcd: function (val) {
		var j;
		for (j=0;val>=100;val-=100) j++;
		Memory.write8(CPU._reg.i,j);
		for (j=0;val>=10;val-=10) j++;
		Memory.write8(CPU._reg.i+1,j);
		Memory.write8(CPU._reg.i+2,val);	
	},
	
	//Instrucciones de salto y llamada
	ret: function () {
		CPU._reg.pc=Memory.read16(CPU._reg.sp);
		CPU._reg.sp+=2;	
	},
	
	call: function (nnn) {
		CPU._reg.sp-=2;
		Memory.write8(CPU._reg.sp,(CPU._reg.pc&0xff00)>>8);
		Memory.write8(CPU._reg.sp+1,CPU._reg.pc&0xff);
		CPU._reg.pc=nnn;
	}

};
	
// Poniendo orden a todo esto...
Chipper = {
	_inspf: 12,	// Instrucciones por frame
	_run: 0,	// Variable para el timeout de cada frame
	_start: 0,	// Tiempo de comienzo en ms
	_frames: 0,	// Frames emulados
	
	// Inicializa el emulador
	reset: function () {
		Memory.reset();
		CPU.reset();
		Screen.setmode(1);
		Keyboard._waiting=false;
		Chipper._start=0;
		Chipper._frames=0;	
	},
	
	// Carga un fichero en memoria, inicializando el sistema
	load: function () {
		clearTimeout(Chipper._run);
		CPU._reg.exit=true;
		var url='loadrom.php?f='+escape($('#romfile').val());
		jQuery.ajax({
			url: url,
			success: function(result) {
				eval(result);		// En romdata tendremos el array de bytes
				Chipper.reset();
				Memory.load(romdata);
				Chipper.frame();	
			},
			async: false
		});
	},
	
	// Muestra los Frames por segundo
	showfps: function (fps) {		
		if (fps==null||fps=='') fps=0;
		// Se formatea fps a dos cifras
		if (parseInt(fps)<10) fps='0'+parseInt(fps);
		var f0=parseInt(fps.charAt(0));	// Decenas
		var f1=parseInt(fps.charAt(1));	// Unidades
		$('#fps0').css({backgroundPosition: '0px '+(-37*(1+f0))+'px'});
		$('#fps1').css({backgroundPosition: '0px '+(-37*(1+f1))+'px'});
	},
		
	// Ejecuta un frame
	frame: function () {
		var t0=(new Date()).getTime();
		if (Chipper._start==0) Chipper._start=t0;
		// Se decrementan los timers
		if (CPU._reg.dt>0) CPU._reg.dt--;
		if (CPU._reg.st>0) { 
			CPU._reg.st--; 
			Sound.play(); 
		} else { 
			Sound.stop(); 
		}
		
		// Se comprueba el teclado si estamos esperando	
		if (Keyboard._waiting) {
			Keyboard.checkwait();	
		} else {		
			for (var i=0;i<Chipper._inspf;i++) {
				if (!Keyboard._waiting&&!CPU._reg.exit) {	
					CPU.exec();
					//console.log(CPU._reg);
				}		
			}	
			Screen.render();
		}
		
		// Incrementamos los frames y calculamos los FPS
		Chipper._frames++;
		var t1=(new Date()).getTime();
		Chipper.showfps(Math.floor(1000*Chipper._frames/(t1-Chipper._start)).toString());

		// Si seguimos la ejecución llamamos otra vez a frame para hacer 60FPS
		if (!CPU._reg.exit) {
			if ((t1-t0)<16) {
				Chipper._run=setTimeout(Chipper.frame,16-(t1-t0));
			} else {
				Chipper._run=setTimeout(Chipper.frame,0);
			}
		}	
	}
};
// Se inicializa el emulador
$(document).ready(function() {
	Keyboard.init();
	Sound.init();
	Screen.init();
});