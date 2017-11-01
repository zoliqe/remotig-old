#include <WebUSB.h>

WebUSB WebUSBSerial(, "zoliqe.github.io/remotig"); // 0 - http://, 1 - https://
#define Serial WebUSBSerial

const bool autospace = 1;
const int sidetone = 650; // Hz
const byte pinLed = 13;
const byte pinDit = 12;
const byte pinDah = 11;
const byte dit = 1;
const byte dah = 2;

String serialCommand = "";
byte wpm = 28;
bool dit_buffer = 0;
bool dah_buffer = 0;
bool iambic_flag = 0;

void setup() {
  pinMode(pinDah, INPUT);
  digitalWrite(pinDah, HIGH);
  pinMode(pinDit, INPUT);
  digitalWrite(pinDit, HIGH);
  pinMode(pinLed, OUTPUT);
  digitalWrite(pinLed, LOW);

  Serial.begin(115200);
}

// --------------------------------------------------------------------------------------------
void loop()
{
  if (Serial) {
    serialControl();
  }
  check_paddles();
  service_dit_dah_buffers();
}

/////////////////////////////// Serial control
void serialControl() {
  if (Serial.available() > 0) {
  	serialCommand = Serial.readStringUntil(';');
//  	Serial.println("got: " + serialCommand);
  	serialProcessCommand();
  }
}

void serialProcessCommand() {
	if (serialCommand.length() < 2) {
		serialCommand = "";
		return;
	}
	
	String cmd = serialCommand;
	String param = cmd.substring(2);
//	Serial.print("\n#" + cmd + "-" + param + "#\n");
	switch (cmd.charAt(0)) {
		case 'K':
			switch (cmd.charAt(1)) {
				case 'S':
					KS(byte(param.toInt()));
					break;
			}
			break;
	}
	serialCommand = "";
}

void KS(byte val) {
	if (val >= 5 && val <= 40) {
		wpm = val;
	}
// 	Serial.print("KS0");
// 	Serial.print(keyerConf.wpm);
// 	Serial.print(';');
//   Serial.flush();
}

///////////////////////////// CW KEYER by K3NG
void check_paddles() {
	check_dit_paddle();
	check_dah_paddle();
}

void check_dit_paddle() {
  if (!digitalRead(pinDit)) {
    dit_buffer = 1;
  }
}

void check_dah_paddle() {
  if (!digitalRead(pinDah)) {
    dah_buffer = 1;
  }
}

byte any_paddle_touched() {
  return digitalRead(pinDit) == LOW || digitalRead(pinDah) == LOW;
}

byte both_paddles_touched() {
  return digitalRead(pinDit) == LOW && digitalRead(pinDah) == LOW;
}

void service_dit_dah_buffers() {
  if ((iambic_flag) && both_paddles_touched()) {
    iambic_flag = 0;
    dit_buffer = 0;
    dah_buffer = 0;
    return;
  }
  
  if (dit_buffer) {
    dit_buffer = 0;
    send_dit();
  }
  if (dah_buffer) {
    dah_buffer = 0;
    send_dah();
  }
}

void send_dit() {
	Serial.print('.');
  Serial.flush();

  digitalWrite(pinLed, HIGH);
  loop_element_lengths(dit, 1);
  digitalWrite(pinLed, LOW);
  loop_element_lengths(dit, 1);
  insert_autospace();

  check_paddles();
}

void send_dah() {
	Serial.print('-');
  Serial.flush();

  digitalWrite(pinLed, HIGH);
  loop_element_lengths(dah, 3);
  digitalWrite(pinLed, LOW);
  loop_element_lengths(dah, 1);
  insert_autospace();

  check_paddles();
}

void insert_autospace() {
  check_paddles();
  if (!dit_buffer && !dah_buffer) {
    loop_element_lengths(0, 2);
  }
}

void loop_element_lengths(byte element, float lengths) {
  if (lengths <= 0) {
    return;
  }
  float element_length = 1200 / wpm;

  unsigned long endtime = micros() + long(element_length * lengths * 1000);
  while ((micros() < endtime) && (micros() > 200000)) {  // the second condition is to account for millis() rollover
    if (both_paddles_touched()) {
      iambic_flag = 1;
    }
    
    if (element == dit) {
      check_dah_paddle();
    } else if (element == dah) {
      check_dit_paddle();
    }
  }
   
  if (iambic_flag && !any_paddle_touched()) {
    iambic_flag = 0;
    dit_buffer = 0;
    dah_buffer = 0;
  }
} //void loop_element_lengths
