
boolean[] pressed = {false,false,false,false};

void setup()
{
  size(590,140);
}

void draw()
{
  fill(0, 0, pressed[0]?255:100);
  rect(0, 0, 140, 140);  
  fill(pressed[1]?255:100, 0, 0);
  rect(150, 0, 140, 140);
  fill(pressed[2]?255:100, pressed[2]?255:100, 0);
  rect(300, 0, 140, 140);
  fill(0, pressed[3]?255:100, 0);
  rect(450, 0, 140, 140);
}

void keyPressed()
{
  if (key >= '1' && key <= '4') {
    if (pressed[key-'1']) {
      return;
    }
  }
  else {
    return;
  }
  
  if (key == '1') {
    addKey("blue");
    pressed[0]=true;
  }
  else if (key == '2') {
    addKey("red");
    pressed[1]=true;
  }
  else if (key == '3') {
    addKey("yellow");
    pressed[2]=true;
  }
  else if (key == '4') {
    addKey("green");
    pressed[3]=true;
  }
}

void keyReleased()
{
  if (key == '1') {
    pressed[0]=false;
  }
  else if (key == '2') {
    pressed[1]=false;
  }
  else if (key == '3') {
    pressed[2]=false;
  }
  else if (key == '4') {
    pressed[3]=false;
  }
}

void addKey(String key)
{
  //return;
  
  try {
    String response[] = loadStrings("https://myexperiments.work:8080/colors/addkey?key="+key);
    for (String s : response) {
      println(s);
    }
  }
  catch(Exception e) {
    println(e);
  }
  
}