
boolean upPressed = false;
boolean downPressed = false;
boolean rightPressed = false;
boolean leftPressed = false;

void setup()
{
  size(590,140);
}

void draw()
{
  fill(0, 0, rightPressed?255:100);
  rect(0, 0, 140, 140);  
  fill(leftPressed?255:100, 0, 0);
  rect(150, 0, 140, 140);
  fill(upPressed?255:100, upPressed?255:100, 0);
  rect(300, 0, 140, 140);
  fill(0, downPressed?255:100, 0);
  rect(450, 0, 140, 140);
}

void keyPressed()
{
  if (keyCode == RIGHT && !rightPressed) {
    addKey("blue");
    rightPressed=true;
  }
  else if (keyCode == LEFT && !leftPressed) {
    addKey("red");
    leftPressed=true;
  }
  else if (keyCode == UP && !upPressed) {
    addKey("yellow");
    upPressed=true;
  }
  else if (keyCode == DOWN && !downPressed) {
    addKey("green");
    downPressed=true;
  }
}

void keyReleased()
{
  if (keyCode == RIGHT) {
    rightPressed=false;
  }
  else if (keyCode == LEFT) {
    leftPressed=false;
  }
  else if (keyCode == UP) {
    upPressed=false;
  }
  else if (keyCode == DOWN) {
    downPressed=false;
  }
}

void addKey(String key)
{
  final String fKey = key;
  try {
    new Thread(new Runnable() {
      public void run() {
        String response[] = loadStrings("https://myexperiments.work:8080/colors/add?key="+fKey);
        if (response != null) {
          for (String s : response) {
            println(s);
          }
        }
      }
    }).start();
  }
  catch(Exception e) {
    println(e);
  } 
}