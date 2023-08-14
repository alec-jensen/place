function main() {
  let cvs = document.querySelector("#viewport-canvas");
  let glWindow = new GLWindow(cvs);

  if (!glWindow.ok()) return;

  let place = new Place(glWindow);
  place.initConnection();

  let gui = GUI(cvs, glWindow, place);
}

const GUI = (cvs, glWindow, place) => {
  let color = new Uint8Array([0, 0, 0]);
  let dragdown = false;
  let touchID = 0;
  let touchScaling = false;
  let lastMovePos = { x: 0, y: 0 };
  let lastScalingDist = 0;
  let touchstartTime;

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  var cooldown = 0;
  const cooldownTime = 2;

  const colorField = document.querySelector("#color-field");

  // ***************************************************
  // ***************************************************
  // Event Listeners
  //
  document.addEventListener("keydown", (ev) => {
    switch (ev.keyCode) {
      case 189:
      case 173:
        ev.preventDefault();
        zoomOut(1.2);
        break;
      case 187:
      case 61:
        ev.preventDefault();
        zoomIn(1.2);
        break;
    }
  });

  window.addEventListener("wheel", (ev) => {
    let zoom = glWindow.getZoom();
    if (ev.deltaY > 0) {
      zoom /= 1.05;
    } else {
      zoom *= 1.05;
    }
    glWindow.setZoom(zoom);
    glWindow.draw();
  });

  document.querySelector("#zoom-in").addEventListener("click", () => {
    zoomIn(1.2);
  });

  document.querySelector("#zoom-out").addEventListener("click", () => {
    zoomOut(1.2);
  });

  window.addEventListener("resize", (ev) => {
    glWindow.updateViewScale();
    glWindow.draw();
  });

  let cooldownInterval = null;

  cvs.addEventListener("mousedown", (ev) => {
    switch (ev.button) {
      case 0:
        dragdown = true;
        lastMovePos = { x: ev.clientX, y: ev.clientY };
        break;
      case 1:
        pickColor({ x: ev.clientX, y: ev.clientY });
        break;
      case 2:
        if (ev.ctrlKey) {
          pickColor({ x: ev.clientX, y: ev.clientY });
        } else {
          if (cooldownInterval !== null) return;
          if (urlParams.get("admin") == "csc") {
            drawPixel({ x: ev.clientX, y: ev.clientY }, color);
            return;
          } 

          drawPixel({ x: ev.clientX, y: ev.clientY }, color);
          cooldown = cooldownTime;

          document.getElementById("cooldown").innerHTML = cooldown;
          document.getElementById("cooldown").style.visibility = "visible";
          cooldownInterval = setInterval(() => {
            if (cooldown > 1) {
              cooldown--;
              document.getElementById("cooldown").innerHTML = cooldown;
            } else {
              clearInterval(cooldownInterval);
              cooldownInterval = null;
              document.getElementById("cooldown").innerHTML = "";
              document.getElementById("cooldown").style.visibility = "hidden";
            }
          }, 1000);
        }
    }
  });

  document.addEventListener("mouseup", (ev) => {
    dragdown = false;
    document.body.style.cursor = "auto";
  });

  document.addEventListener("mousemove", (ev) => {
    const movePos = { x: ev.clientX, y: ev.clientY };
    if (dragdown) {
      glWindow.move(movePos.x - lastMovePos.x, movePos.y - lastMovePos.y);
      glWindow.draw();
      document.body.style.cursor = "grab";
    }
    lastMovePos = movePos;
  });

  cvs.addEventListener("touchstart", (ev) => {
    let thisTouch = touchID;
    touchstartTime = new Date().getTime();
    lastMovePos = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
    if (ev.touches.length === 2) {
      touchScaling = true;
      lastScalingDist = null;
    }

    setTimeout(() => {
      if (thisTouch == touchID) {
        pickColor(lastMovePos);
        navigator.vibrate(200);
      }
    }, 350);
  });

  document.addEventListener("touchend", (ev) => {
    touchID++;
    let elapsed = new Date().getTime() - touchstartTime;
    if (elapsed < 250) {
      if (cooldownInterval !== null) return;
      if (urlParams.get("admin") == "csc") {
        drawPixel(lastMovePos, color);
        return;
      }

      drawPixel({ x: ev.clientX, y: ev.clientY }, color);
      cooldown = cooldownTime;

      document.getElementById("cooldown").innerHTML = cooldown;
      document.getElementById("cooldown").style.visibility = "visible";
      cooldownInterval = setInterval(() => {0
        if (cooldown > 1) {
          cooldown--;
          document.getElementById("cooldown").innerHTML = cooldown;
        } else {
          clearInterval(cooldownInterval);
          cooldownInterval = null;
          document.getElementById("cooldown").innerHTML = "";
          document.getElementById("cooldown").style.visibility = "hidden";
        }
      }, 1000);
      if (drawPixel(lastMovePos, color)) {
        navigator.vibrate(10);
      }
    }
    if (ev.touches.length === 0) {
      touchScaling = false;
    }
  });

  document.addEventListener("touchmove", (ev) => {
    touchID++;
    if (touchScaling) {
      let dist = Math.hypot(
        ev.touches[0].pageX - ev.touches[1].pageX,
        ev.touches[0].pageY - ev.touches[1].pageY
      );
      if (lastScalingDist != null) {
        let delta = lastScalingDist - dist;
        if (delta < 0) {
          zoomIn(1 + Math.abs(delta) * 0.003);
        } else {
          zoomOut(1 + Math.abs(delta) * 0.003);
        }
      }
      lastScalingDist = dist;
    } else {
      let movePos = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
      glWindow.move(movePos.x - lastMovePos.x, movePos.y - lastMovePos.y);
      glWindow.draw();
      lastMovePos = movePos;
    }
  });

  cvs.addEventListener("contextmenu", () => {
    return false;
  });

  colorField.addEventListener("change", (ev) => {
    let hex = colorField.value.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
    hex = hex.substring(0, 6);
    while (hex.length < 6) {
      hex += "0";
    }
    color[0] = parseInt(hex.substring(0, 2), 16);
    color[1] = parseInt(hex.substring(2, 4), 16);
    color[2] = parseInt(hex.substring(4, 6), 16);
    hex = "#" + hex;
    colorField.value = hex;
  });

  // ***************************************************
  // ***************************************************
  // Helper Functions
  //
  const pickColor = (pos) => {
    color = glWindow.getColor(glWindow.click(pos));
    let hex = "#";
    for (let i = 0; i < color.length; i++) {
      let d = color[i].toString(16);
      if (d.length == 1) d = "0" + d;
      hex += d;
    }
    colorField.value = hex.toUpperCase();
  };

  const drawPixel = (pos, color) => {
    pos = glWindow.click(pos);
    if (pos) {
      const oldColor = glWindow.getColor(pos);
      for (let i = 0; i < oldColor.length; i++) {
        if (oldColor[i] != color[i]) {
          place.setPixel(pos.x, pos.y, color);
          return true;
        }
      }
    }
    return false;
  };

  const zoomIn = (factor) => {
    let zoom = glWindow.getZoom();
    glWindow.setZoom(zoom * factor);
    glWindow.draw();
  };

  const zoomOut = (factor) => {
    let zoom = glWindow.getZoom();
    glWindow.setZoom(zoom / factor);
    glWindow.draw();
  };
};
