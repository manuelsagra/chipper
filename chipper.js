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

// jQuery AJAX binary loading plugin: http://www.henryalgus.com/reading-binary-files-using-jquery-ajax/
$.ajaxTransport("+binary", function(options, originalOptions, jqXHR){
	if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob)))))
	{
		return {
			send: function(headers, callback){
				var xhr = new XMLHttpRequest(),
				url = options.url,
				type = options.type,
				async = options.async || true,
				dataType = options.responseType || "blob",
				data = options.data || null,
				username = options.username || null,
				password = options.password || null;

				xhr.addEventListener('load', function(){
					var data = {};
					data[options.dataType] = xhr.response;
					callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
				});

				xhr.open(type, url, async, username, password);

				for (var i in headers ) {
					xhr.setRequestHeader(i, headers[i]);
				}

				xhr.responseType = dataType;
				xhr.send(data);
			},
			abort: function(){
				jqXHR.abort();
			}
		};
	}
});

var Chipper = function() {
	this.memory = new Memory(this);
	this.screen = new Screen(this);
	this.sound = new Sound();
	this.keyboard = new Keyboard(this);
	this.cpu = new CPU(this);
};
Chipper.prototype = {
	inspf: 8,	// Instructions per frame
	run: 0,
	start: 0,
	frames: 0,

	init: function() {
		this.screen.init();
		this.sound.init();
		this.keyboard.init();
	},

	reset: function() {
		this.memory.reset();
		this.cpu.reset();
		this.screen.setMode(1);
		this.keyboard.waiting = false;
		this.start = 0;
		this.frames = 0;
	},

	load: function() {
		this.cpu.reg.exit = true;
		var chp = this;
		$.ajax({
			url: $('#romfile').val(),
			dataType: 'binary',
			headers: {
				'Content-Type': 'application/octet-stream',
				'X-Requested-With': 'XMLHttpRequest'
			},
        		processData: false,
			success: function(data) {
				chp.memory.load(data);
			}
		});
	},

	showFPS: function(fps) {
		if (!fps || fps == '') {
			fps = 0;
		}
		if (parseInt(fps) < 10) {
			fps = '0' + parseInt(fps);
		}
		$('#fps0').css({
			backgroundPosition: '0px ' + (-37 * (1 + parseInt(fps.charAt(0)))) + 'px'
		});
		$('#fps1').css({
			backgroundPosition: '0px ' + (-37 * (1 + parseInt(fps.charAt(1)))) + 'px'
		});
	},

	frame: function() {
		var t0 = (new Date()).getTime();
		if (this.start == 0) {
			this.start = t0;
		}

		// Timers
		if (this.cpu.reg.dt > 0) {
			this.cpu.reg.dt--;
		}
		if (this.cpu.reg.st > 0) {
			this.cpu.reg.st--;
			this.sound.play();
		} else {
			this.sound.stop();
		}

		// Keyboard
		if (this.keyboard.waiting) {
			this.keyboard.checkWait();
		} else {
			for (var i = 0; i < this.inspf; i++) {
				if (!this.keyboard.waiting && !this.cpu.reg.exit) {
					this.cpu.execute();
				}
			}
			this.screen.render();
		}

		// Frame counting
		this.frames++;
		var t1 = (new Date()).getTime();
		this.showFPS(Math.floor(1000 * this.frames / (t1 - this.start)).toString());

		// Next frame
		if (!this.cpu.reg.exit) {
			var chp = this;
			if ((t1 - t0) < 16) {
				setTimeout(function() {
					chp.frame();
				}, 16 - (t1 - t0));
			} else {
				this.frame();
			}
		}
	}
};

var Memory = function(chipper) {
	this.chipper = chipper;
};
Memory.prototype = {
	ram: [],
	fonts: [
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

	reset: function() {
		for (var i = 0; i < 0x1000; i++) {		// 4KB RAM
			this.ram[i] = 0;
		}
		for (var i = 0; i < this.fonts.length; i++) {	// Fonts
			this.ram[i] = this.fonts[i];
		}
	},

	load: function(data) {
		this.chipper.reset();
		this.chipper.cpu.reg.exit = true;
		var mem = this;
		var reader = new FileReader();
		reader.addEventListener("loadend", function() {
			var arr = new Uint8Array(this.result);
			for (var i = 0; i < arr.length; i++) {
				mem.ram[i + 0x200] = arr[i] & 0xff;
			}
			mem.chipper.cpu.reg.exit = false;
			mem.chipper.frame();
		});
		reader.readAsArrayBuffer(data);
	},

	read8: function(address) {
		return this.ram[address];
	},

	read16: function(address) {
		return (this.ram[address] << 8) + this.ram[address + 1];
	},

	write8: function(address, val) {
		this.ram[address] = val;
	},

	write16: function(address, val) {
		this.ram[address] = (val & 0xff00) >> 8;
		this.ram[address + 1] = val & 0xff;
	}
};

var Screen = function(chipper) {
	this.chipper = chipper;
};
Screen.prototype = {
	canvas: {},
	canvasCtx: {},
	canvasWidth: 0,
	canvasHeight: 0,
	screenWidth: 64,
	screenHeight: 32,
	pixelSize: 0,
	mode: 1,			// 1: 64x32, 2: 128x64
	vram: [],
	vramSize: 0,
	changed: false,			// Frame changed?
	patternImg: 'img/pixel.png',
	pattern: null,

	init: function() {
		if (!(document.createElement('canvas').getContext('2d'))) {
			alert("Error getting canvas!");
			return;
		}
		this.canvas = $("#chipperScreen")[0];
		this.canvasCtx = this.canvas.getContext('2d');
		this.setMode(1);
		if (this.pattern == null) {
			var img = new Image();
			img.src = this.patternImg;
			var scr = this;
			img.onload = function() {
				scr.pattern = scr.canvasCtx.createPattern(img, 'repeat');
			}
		}
	},

	clear: function() {
		this.canvas.width = this.canvas.width;	// Little hack
		for (var i = 0; i < this.vramSize; i++) {
			this.vram[i] = 0;
		}
	},

	drawSprite: function(x, y, n) {
		var w = 8;
		if (n == 0) {
			n = 16;
			w = 16;
		}
		this.chipper.cpu.reg.v[0xf] = 0;

		// Draw line by line
		for (var i = 0; i < n; i++) {
			var l = (w == 8) ? this.chipper.memory.read8(this.chipper.cpu.reg.i + i).toString(2) : this.chipper.memory.read16(this.chipper.cpu.reg.i + 2 * i).toString(2);
			while (l.length < w) {
				l = "0" + l;
			}
			for (var j = 0; j < w; j++) {
				if (l.charAt(j) == "1") {	// XOR pixel painting
					var vx = x + j;
					var vy = y + i;

					// Screen wrapping
					if (vx > this.screenWidth) {
						vx -= this.screenWidth;
					} else if (vx < 0) {
						vx += this.screenWidth;
					}
					if (vy > this.screenHeight) {
						vy -= this.screenHeight;
					} else if (vy < 0) {
						vy += this.screenHeight;
					}

					var posvram = this.screenWidth * vy + vx;
					this.vram[posvram] ^= 1;

					// Collision?
					if (this.vram[posvram] == 0) {
						this.chipper.cpu.reg.v[0xf] = 1;
					}

					this.changed = true;
				}
			}
		}
	},

	scrollX: function(x) {
		var lines = x * this.mode/ 2;
		var newvram = [];

		for (var i = 0; i < vramSize; i++) {
			newvram[i] = 0;
		}
		var rx = 1 << (5 + this.mode);
		var ry = 1 << (4 + this.mode);
		for (var y = 0; y < ry; y++) {
			var skip = y << (5 + this.mode);
			if (lines > 0) {
				for (var x = lines; x < rx; x++) {
					newvram[x - lines + skip] = this.vram[x + skip];
				}
			} else {
				for (var x = 0; x < (rx + lines); x++) {
					newvram[x + skip] = this.vram[x - lines + skip];
				}
			}
		}

		this.vram = newvram.slice();
		this.changed = true;
	},


	scrollY: function(y) {
		var lines = Math.floor(y * this.mode / 2);
		var newvram = [];

		for (var i=0;i<vramSize;i++) {
		     newvram[i] = 0;
     		}

		var skip = lines << (5 + this.mode);
		for (var i = 0; i < (vramSize - skip); i++) {
			newvram[i + skip] = this.vram[i];
		}

		this.vram = newvram.slice();
		this.changed = true;
	},

	render: function() {
		if (this.changed) {
			this.canvas.width = this.canvas.width;
			if (this.pattern != null) {
				this.canvasCtx.fillStyle = this.pattern;
			} else {
				this.canvasCtx.fillStyle = '#000';
			}

			for (var i = 0; i < this.vramSize; i++) {
				if (this.vram[i] == 1) {
					var y = i >> (5 + this.mode);
					var x = i % (1 << (5 + this.mode));
					this.canvasCtx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
				}
			}
			this.changed = false;
		}
	},

	setMode: function(m) {
		this.mode = m;
		this.screenWidth = 64 * m;
		this.screenHeight = 32 * m;
		this.pixelSize = this.canvas.width >> (6 + (m - 1));
		this.vramSize = this.screenWidth * this.screenHeight;
		this.clear();
	}
};

var Sound = function() {
};
Sound.prototype = {
	audio: {},

	init: function() {
		if (!(document.createElement('audio').canPlayType)) {
			alert("Error intializing sound!");
			return;
		}
		this.audio = $("#chipperAudio")[0];
	},

	play: function() {
		if (this.audio.currentTime > 2000) {
			this.audio.currentTime = 0;
		}
		this.audio.play();
	},

	stop: function() {
	 	this.audio.pause();
	}
};

var Keyboard = function(chipper) {
	this.chipper = chipper;
};
Keyboard.prototype = {
	waiting: false,
	waitReg: 0,
	keyMatrix: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],

	check: function(k) {
		return this.keyMatrix[k];
	},

	wait: function(r) {
		this.waiting = true;
		this.waitReg = r;
	},

	checkWait: function() {
		for (var i = 0; i < this.keyMatrix.length; i++) {
			if (this.keyMatrix[i]) {
				this.chipper.cpu.reg.v[this.waitReg] = i;
				this.waiting = false;
				break;
			}
		}
	},

	init: function() {
		for (var i = 0; i < this.keyMatrix.length; i++) {
			var kb = this;
			$('#b' + i.toString(16)).mousedown(function() {
				kb.keyMatrix[parseInt(this.id.charAt(1), 16)] = true;
			});
			$('#b' + i.toString(16)).mouseup(function() {
				kb.keyMatrix[parseInt(this.id.charAt(1), 16)] = false;
			});
		}
	},

	keyDown: function(keyCode) {
		switch(keyCode) {
			case 88: this.keyMatrix[0x0] = true; break;	// Key x
			case 49: this.keyMatrix[0x1] = true; break;	// Key 1
			case 50: this.keyMatrix[0x2] = true; break;	// Key 2
			case 51: this.keyMatrix[0x3] = true; break;	// Key 3
			case 81: this.keyMatrix[0x4] = true; break;	// Key q
			case 87: this.keyMatrix[0x5] = true; break;	// Key w
			case 69: this.keyMatrix[0x6] = true; break;	// Key e
			case 65: this.keyMatrix[0x7] = true; break;	// Key a
			case 83: this.keyMatrix[0x8] = true; break;	// Key s
			case 68: this.keyMatrix[0x9] = true; break;	// Key d
			case 90: this.keyMatrix[0xa] = true; break;	// Key z
			case 67: this.keyMatrix[0xb] = true; break;	// Key c
			case 52: this.keyMatrix[0xc] = true; break;	// Key 4
			case 82: this.keyMatrix[0xd] = true; break;	// Key r
			case 70: this.keyMatrix[0xe] = true; break;	// Key f
			case 86: this.keyMatrix[0xf] = true; break;	// Key v
		}
	},

	keyUp: function(keyCode) {
		switch(keyCode) {
			case 88: this.keyMatrix[0x0] = false; break;	// Key x
			case 49: this.keyMatrix[0x1] = false; break;	// Key 1
			case 50: this.keyMatrix[0x2] = false; break;	// Key 2
			case 51: this.keyMatrix[0x3] = false; break;	// Key 3
			case 81: this.keyMatrix[0x4] = false; break;	// Key q
			case 87: this.keyMatrix[0x5] = false; break;	// Key w
			case 69: this.keyMatrix[0x6] = false; break;	// Key e
			case 65: this.keyMatrix[0x7] = false; break;	// Key a
			case 83: this.keyMatrix[0x8] = false; break;	// Key s
			case 68: this.keyMatrix[0x9] = false; break;	// Key d
			case 90: this.keyMatrix[0xa] = false; break;	// Key z
			case 67: this.keyMatrix[0xb] = false; break;	// Key c
			case 52: this.keyMatrix[0xc] = false; break;	// Key 4
			case 82: this.keyMatrix[0xd] = false; break;	// Key r
			case 70: this.keyMatrix[0xe] = false; break;	// Key f
			case 86: this.keyMatrix[0xf] = false; break;	// Key v
		}
	}
};

var CPU = function(chipper) {
	this.chipper = chipper;
};
CPU.prototype = {
	reg: {
		v: [],
		pc: 0x200,	// Program Counter (usually 0x200, save from ETI 660 programs)
		sp: 0x200,	// Stack Pointer. Arbitrary value...
		dt: 0,		// Delay Timer
		st: 0,		// Sound Timer
		i: 0,
		exit: false
	},

	reset: function() {
		for (var i = 0; i<16 ; i++) {
			this.reg.v[i] = 0;
		}
		this.reg.pc = 0x200;
		this.reg.sp = 0x100;
		this.reg.dt = 0;
		this.reg.st = 0;
		this.reg.i = 0;
		this.reg.exit = false;
	},

	execute: function() {
		var opcode = this.chipper.memory.read16(this.reg.pc);

		var nnn = (opcode & 0xfff);

		var b1 = (opcode & 0xff00) >> 8;
		var b2 = (opcode & 0xff);

		var n1 = (opcode & 0xf000) >> 12;
		var n2 = (opcode & 0xf00) >> 8;
		var n3 = (opcode & 0xf0) >> 4;
		var n4 = (opcode & 0xf);

		this.reg.pc += 2;

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
						this.chipper.screen.scrollY(n4);
						break;
					case 0xe0:	// CLS
						this.chipper.screen.clear();
						break;
					case 0xee:	// RET
						this.reg.pc = this.chipper.memory.read16(this.reg.sp);
						this.reg.sp += 2;
						break;
					case 0xfb:	// SCR (SCHIP)
						this.chipper.screen.scrollX(4);
						break;
					case 0xfc:	// SCL (SCHIP)
						this.chipper.screen.scrollX(-4);
						break;
					case 0xfd:	// EXIT (SCHIP)
						this.reg.exit = true;
						break;
					case 0xfe:	// LOW (SCHIP)
						this.chipper.screen.setMode(1);
						break;
					case 0xff:	// HIGH (SCHIP)
						this.chipper.screen.setMode(2);
						break;
					default:
						break;
				}
				break;
			case 0x1:		// JP nnn
				this.reg.pc = nnn;
				break;
			case 0x2:		// CALL nnn
				this.reg.sp -=2;
				this.chipper.memory.write16(this.reg.sp, this.reg.pc);
				this.reg.pc = nnn;
				break;
			case 0x3:		// SE Vx, nn
				if (this.reg.v[n2] == b2) {
					this.reg.pc += 2;
				}
				break;
			case 0x4:		// SNE Vx, nn
				if (this.reg.v[n2] != b2) {
					this.reg.pc += 2;
				}
				break;
			case 0x5:		// SE Vx, Vy
				if (n4 == 0) {
					if (this.reg.v[n2] == this.reg.v[n3]) {
						this.reg.pc += 2;
					}
				}
				break;
			case 0x6:		// LD Vx, nn
				this.reg.v[n2] = b2;
				break;
			case 0x7:		// ADD Vx, nn
				this.reg.v[n2] += b2;
				this.reg.v[n2] &= 0xff;
				break;
			case 0x8:
				switch (n4) {
					case 0x0:		// LD Vx, Vy
						this.reg.v[n2] = this.reg.v[n3];
						break;
					case 0x1:		// OR Vx, Vy
						this.reg.v[n2] |= this.reg.v[n3];
						break;
					case 0x2:		// AND Vx, Vy
						this.reg.v[n2] &= this.reg.v[n3];
						break;
					case 0x3:		// XOR Vx, Vy
						this.reg.v[n2] ^= this.reg.v[n3];
						break;
					case 0x4:		// ADD Vx, Vy
						this.reg.v[n2] += this.reg.v[n3];
						this.reg.v[0xf] = (this.reg.v[n2] > 0xff) ? 1 : 0;
						this.reg.v[n2] &= 0xff;
						break;
					case 0x5:		// SUB Vx, Vy
						this.reg.v[0xf] = (this.reg.v[n2] > this.reg.v[n3]) ? 1 : 0;
						this.reg.v[n2] -= this.reg.v[n3];
						this.reg.v[n2] &= 0xff;
						break;
					case 0x6:		// SHR Vx {,Vy}
						this.reg.v[0xf] = this.reg.v[n2] & 1;
						this.reg.v[n2] >>= 1;
						break;
					case 0x7:		// SUBN Vx, Vy
						this.reg.v[0xf] = (this.reg.v[n3] > this.reg.v[n2]) ? 1 : 0;
						this.reg.v[n2] = this.reg.v[n3] - this.reg.v[n2];
						this.reg.v[n2] &= 0xff;
						break;
					case 0xe:		// SHL Vx {,Vy}
						this.reg.v[0xf] = (this.reg.v[n2] >> 7);
						this.reg.v[n2] <<= 1;
						this.reg.v[n2] &= 0xff;
						break;
					default:
						break;
				}
				break;
			case 0x9:		// SNE Vx, Vy
				if (n4 == 0) {
					if (this.reg.v[n2] != this.reg.v[n3]) {
						this.reg.pc += 2;
					}
				}
				break;
			case 0xa:		// LD I, nnn
				this.reg.i = nnn;
				break;
			case 0xb:		// JP V0, nnn
				this.reg.pc = nnn + this.reg.v[0];
				break;
			case 0xc:		// RND Vx, nn
				this.reg.v[n2] = Math.floor(Math.random() * 10000) & b2;
				break;
			case 0xd:		// DRW Vx, Vy, n
				this.chipper.screen.drawSprite(this.reg.v[n2], this.reg.v[n3], n4);
				break;
			case 0xe:
				switch (b2) {
					case 0x9e:	// SKP Vx
						if (this.chipper.keyboard.check(this.reg.v[n2])) {
							this.reg.pc += 2;
						}
						break;
					case 0xa1:	// SKNP Vx
						if (!this.chipper.keyboard.check(this.reg.v[n2])) {
							this.reg.pc += 2;
						}
						break;
					default:
						break;
				}
				break;
			case 0xf:
				switch (b2) {
					case 0x07:	// LD Vx, DT
						this.reg.v[n2] = this.reg.dt;
						break;
					case 0x0a:	// LD Vx, K
						this.chipper.keyboard.wait(n2);
						break;
					case 0x15:	// LD DT, Vx
						this.reg.dt = this.reg.v[n2];
						break;
					case 0x18: 	// LD ST, Vx
						this.reg.st = this.reg.v[n2];
						break;
					case 0x1e:	// ADD I, Vx
						this.reg.i += this.reg.v[n2];
						this.reg.i &= 0xfff;
						break;
					case 0x29:	// LD F, Vx
						this.reg.i = this.reg.v[n2] * 5;
						break;
					case 0x33:	// LD B, Vx
						this.bcd(this.reg.v[n2]);
						break;
					case 0x55:	// LD [I], Vx
						for (var i = 0; i <= n2; i++) {
							this.chipper.memory.write8(this.reg.i + i, this.reg.v[i]);
						}
						break;
					case 0x65:	// LD Vx, [I]
						for (var i = 0; i <= n2; i++) {
							this.reg.v[i] = this.chipper.memory.read8(this.reg.i + i);
						}
						break;
					case 0x75:	// LD R, Vx
						console.log('Unemulated opcode');
						break;
					case 0x85:	// LD Vx, R
						console.log('Unemulated opcode');
						break;
					default:
						break;
				}
				break;
		}
	},

	bcd: function(val) {
		var j;
		for (j = 0; val >= 100; val -= 100) {
			j++;
		}
		this.chipper.memory.write8(this.reg.i, j);
		for (j = 0; val >= 10; val -= 10) {
			j++;
		}
		this.chipper.memory.write8(this.reg.i + 1, j);
		this.chipper.memory.write8(this.reg.i + 2, val);
	}
};

$(document).ready(function() {
	var chipper = new Chipper();
	$(document).keyup(function(e) {
		chipper.keyboard.keyUp(e.keyCode);
	});
	$(document).keydown(function(e) {
		chipper.keyboard.keyDown(e.keyCode);
	});
	$('input.run').click(function(e) {
		chipper.load();
	});
	chipper.init();
	chipper.load();
});