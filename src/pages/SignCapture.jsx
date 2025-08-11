import { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";

export default function SignCapture() {
  // Example images grouped as pairs (arrays of two)
  const exampleImagePairs = [
    ["/images/ex1input.png", "/images/ex1output.png"],
    ["/images/ex2input.png", "/images/ex2output.png"],
    ["/images/ex3input.png", "/images/ex3output.png"],
    ["/images/ex4input.png", "/images/ex4output.png"],
  ];

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [model, setModel] = useState(null);
  const [classNames, setClassNames] = useState([]);
  const [predictionResult, setPredictionResult] = useState("Loading model...");

  useEffect(() => {
    async function loadModelAndClasses() {
      try {
        const loadedModel = await tf.loadLayersModel("/model_web/model.json");
        const res = await fetch("/model_web/class_names.json");
        const classes = await res.json();
        setModel(loadedModel);
        setClassNames(classes);
        setPredictionResult("Model loaded. Show your hand!");
        console.log("Model and classes loaded.");
      } catch (error) {
        console.error("Error loading model:", error);
        setPredictionResult("Failed to load model.");
      }
    }
    loadModelAndClasses();
  }, []);

  useEffect(() => {
    if (!webcamRef.current || !webcamRef.current.video) return;

    if (!window.Hands || !window.Camera || !window.drawConnectors) {
      console.error("MediaPipe scripts not loaded yet");
      return;
    }

    const hands = new window.Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(async (results) => {
      if (!canvasRef.current) return;
      const canvasCtx = canvasRef.current.getContext("2d");
      canvasCtx.save();

      canvasCtx.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      canvasCtx.fillStyle = "#1e1e2f"; // dark background
      canvasCtx.fillRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
            color: "#61dafb",
            lineWidth: 3,
          });
          window.drawLandmarks(canvasCtx, landmarks, { color: "#21d07a", radius: 5 });
        }

        if (model && classNames.length > 0) {
          tf.tidy(() => {
            const imgTensor = tf.browser
              .fromPixels(canvasRef.current)
              .resizeBilinear([64, 64])
              .toFloat()
              .expandDims(0);

            const predictions = model.predict(imgTensor);
            const scores = predictions.dataSync();

            const maxIdx = scores.indexOf(Math.max(...scores));
            setPredictionResult(
              `${classNames[maxIdx]} — ${(scores[maxIdx] * 100).toFixed(1)}%`
            );

            imgTensor.dispose();
            predictions.dispose();
          });
        }
      } else {
        setPredictionResult("No hand detected");
      }

      canvasCtx.restore();
    });

    const camera = new window.Camera(webcamRef.current.video, {
      onFrame: async () => {
        await hands.send({ image: webcamRef.current.video });
      },
      width: 640,
      height: 480,
    });

    camera.start();

    return () => {
      camera.stop();
      hands.close();
    };
  }, [model, classNames]);

  return (
    <>
      <div
        style={{
          height: "100%",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          fontFamily: "'Poppins', sans-serif",
          color: "#fff",
          display: "flex",
          padding: "40px",
          gap: "40px",
          overflowY: "hidden",
          borderRadius: "25px",
        }}
      >
        {/* Left panel 40% */}
        <div
          style={{
            flexBasis: "40%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingRight: "20px",
            borderRight: "2px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <h1
            style={{
              fontWeight: "700",
              fontSize: "2.8rem",
              letterSpacing: "1px",
              marginBottom: "50px",
            }}
          >
            Live Sign Language Recognition
          </h1>
          <p
            style={{
              fontSize: "1.5rem",
              opacity: 0.85,
              lineHeight: 1.5,
              fontStyle: "italic",
            }}
          >
            Scroll down for info & instructions to use
          </p>
        </div>

        {/* Right panel 60% */}
        <div
          style={{
            flexBasis: "60%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 640,
              borderRadius: 20,
              overflow: "hidden",
              boxShadow:
                "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 10px 5px rgba(97, 218, 251, 0.7)",
              backgroundColor: "#121227",
            }}
          >
            <Webcam
              ref={webcamRef}
              style={{ position: "absolute", visibility: "hidden" }}
              videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                transform: "scaleX(-1)", // mirror feed horizontally
                userSelect: "none",
                backgroundColor: "#1e1e2f",
              }}
            />
          </div>

          <div
            style={{
              marginTop: 24,
              padding: "12px 24px",
              backgroundColor: "rgba(33, 208, 122, 0.85)",
              borderRadius: 40,
              minWidth: 240,
              fontSize: "1.5rem",
              fontWeight: "700",
              boxShadow:
                "0 8px 15px rgba(33, 208, 122, 0.6), 0 0 10px rgba(33, 208, 122, 0.7)",
              color: "#121227",
              letterSpacing: "1px",
              userSelect: "none",
              transition: "all 0.3s ease",
              textAlign: "center",
            }}
          >
            {predictionResult}
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div
        style={{
          width: "100%",
          marginTop: "40px",
          padding: "20px 40px",
          backgroundColor: "#121227",
          borderRadius: "20px",
          marginLeft: "auto",
          marginRight: "auto",
          fontFamily: "'Poppins', sans-serif",
          color: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        {/* Buttons container */}
        <div
          style={{
            textAlign: "center",
            margin: "24px",
            display: "flex",
            justifyContent: "center",
            gap: "20px",
          }}
        >
          <a
            href="https://github.com/Omkar982004/Sign-Language-Detection"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: "20%",
              backgroundColor: "#61dafb",
              color: "#121227",
              padding: "12px 28px",
              fontWeight: "700",
              borderRadius: "40px",
              textDecoration: "none",
              fontSize: "1.2rem",
              boxShadow: "0 5px 15px rgba(97, 218, 251, 0.7)",
              transition: "background-color 0.3s ease",
              display: "inline-block",
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#52c0e8")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#61dafb")
            }
          >
            GitHub Repo
          </a>

          <a
            href="https://github.com/Omkar982004/Sign-Language-Detection"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: "20%",
              backgroundColor: "#61dafb",
              color: "#121227",
              padding: "12px 28px",
              fontWeight: "700",
              borderRadius: "40px",
              textDecoration: "none",
              fontSize: "1.2rem",
              boxShadow: "0 5px 15px rgba(97, 218, 251, 0.7)",
              transition: "background-color 0.3s ease",
              display: "inline-block",
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#52c0e8")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#61dafb")
            }
          >
            Learn More
          </a>
        </div>

        {/* Instructions */}
        <div
          style={{
            fontSize: "1.5rem",
            lineHeight: 1.6,
            marginBottom: "30px",
            textAlign: "center",
            fontStyle: "italic",
            margin: "60px auto 40px auto",
            opacity: 0.8,
          }}
        >
          <p>
            A React.js web app powered by a CNN trained on 1200 images (300 per
            letter) for real-time sign language recognition, designed to assist
            hearing-impaired users—using MediaPipe and TensorFlow.js to
            interpret hand gestures via webcam input.
          </p>
          <br />
          <p>
            INSTRUCTIONS: Position your hand approximately 30cm from the camera,
            centered within the frame.
          </p>
        </div>

        {/* Examples images grouped as pairs */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            alignItems: "center",
          }}
        >
          {exampleImagePairs.map((pair, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                gap: "20px",
              }}
            >
              {pair.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Example ${idx + 1} - Image ${i + 1}`}
                  style={{
                    width: "350px",
                    height: "auto",
                    borderRadius: "15px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                    objectFit: "cover",
                    marginLeft: "20px",
                    marginRight: "20px",
                    marginBottom: "30px",
                    marginTop: "30px",
                  }}
                  loading="lazy"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
