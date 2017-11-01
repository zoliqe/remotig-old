// #include <SoftwareSerial.h>
#include <WebUSB.h>

WebUSB WebUSBSerial(1, "zoliqe.github.io/remotig/tcvr-k2-om4aa"); // 0 - http://, 1 - https://
#define Serial WebUSBSerial
// SoftwareSerial catSerial(2, 3); // RX, TX
#define catSerial Serial1

const int ledPin = 13;
const int pwrPin = 12;
const int icomPwrPin = 11;
const int timeOutMins = 1; 

bool state = LOW;
unsigned long milisStop;

void setup() {
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, state);
  pinMode(pwrPin, OUTPUT);
  digitalWrite(pwrPin, state);
  pinMode(icomPwrPin, OUTPUT);
  digitalWrite(icomPwrPin, LOW);

  // while (!Serial) {
  //   ;
  // }
  Serial.begin(115200);
  Serial.println("READY");
  Serial.flush();

  catSerial.begin(4800); /* icom: 9600 */
}

void loop() {
  if (Serial && Serial.available()) {
    String val = Serial.readStringUntil(';');
    // Serial.write(val);
    if (val == "POWERON") {
      on();
    } else if (val == "POWEROFF") {
      off();
    } else if (val == "POWERSTATE") {
      swstate();
    } else {
      catSerial.write(val + ";");
    }
//    Serial.write("\r\n> ");
  }
  if (state) {
    if (millis() > milisStop) {
      off();
    } else {
      info();
    }
  }
  delay(1000);
}

void on() {
  bool prevState = state;
  state = HIGH;
  swstate();
  
  if (!prevState) { // simulate power button push on icom
    delay(1000); // for pwr source startup
    digitalWrite(icomPwrPin, HIGH);
    delay(3000);
    digitalWrite(icomPwrPin, LOW);
  }

  milisStop = millis() + (timeOutMins * 60000);
}

void off() {
  if (!state) {
    return;
  }
  state = LOW;
  swstate();
}

void swstate() {
  Serial.println(state ? "HIGH" : "LOW");
  digitalWrite(ledPin, state);
  digitalWrite(pwrPin, state);
  Serial.flush();
}

void info() {
  unsigned long remains = milisStop - millis();
  unsigned int mins = remains / 60000;
  unsigned int secs = (remains - mins * 60000) / 1000;
  Serial.print(mins < 10 ? "T0" : "T");
  Serial.print(mins);
  Serial.print(secs < 10 ? ":0" : ":");
  Serial.println(secs);
  Serial.flush();

  // if (catSerial && catSerial.available()) {
  //   iqrg();
  // }
}

void iqrg() {
  uint8_t buff[11];
  uint8_t len = 0;
  Serial.print("CIV=");
  while (catSerial.available() && len < 11) {
    buff[len] = catSerial.read();
    Serial.print(buff[len]);
    Serial.print(',');
    len++;
  }
  Serial.println("");
  Serial.flush();
  if (buff[4] == 0 || buff[4] == 3) {
    uint8_t MHZ_100 = (buff[8]);
    MHZ_100 = MHZ_100 - (((MHZ_100 / 16) * 6));
    uint8_t MHZ = (buff[7]);
    MHZ = MHZ - (((MHZ / 16) * 6));
    uint8_t KHZ = buff[6];
    KHZ = KHZ - (((KHZ / 16) * 6));
    uint8_t HZ = buff[5];
    HZ = HZ - (((HZ / 16) * 6));
    unsigned long QRG = ((MHZ * 10000) + (KHZ * 100) + (HZ * 1));
    Serial.print("QRG=");
    Serial.println(QRG);
  }
}
