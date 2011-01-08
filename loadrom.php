<?php
$name='./c8/TETRIS';
if (isset($_GET['f'])&&$_GET['f']!='') $name='./'.$_GET['f'];
echo 'var romdata=[';
if (file_exists($name)) {
	$file=file_get_contents($name);
	for ($i=0;$i<strlen($file);$i++) {
		if ($i>0)	echo ', ';
		echo '0x'.bin2hex(substr($file,$i,1));
	}
}
echo '];';
?>