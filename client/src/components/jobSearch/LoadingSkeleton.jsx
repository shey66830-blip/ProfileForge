import React from "react";

export default function LoadingSkeleton({ count = 6 }) {
  return (
    <section>

      <div
        className="grid three"
        style={{
          gap: "20px",
        }}
      >

        {Array.from({ length: count }).map((_, index) => (

          <div
            key={index}
            className="card"
            style={{
              minHeight: "420px",
              animation: "pulse 1.5s infinite",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >

              <div>

                <div
                  style={{
                    width: "180px",
                    height: "18px",
                    background: "#2b2b40",
                    borderRadius: "8px",
                    marginBottom: "10px",
                  }}
                />

                <div
                  style={{
                    width: "120px",
                    height: "14px",
                    background: "#2b2b40",
                    borderRadius: "8px",
                  }}
                />

              </div>

              <div
                style={{
                  width: "55px",
                  height: "55px",
                  borderRadius: "50%",
                  background: "#2b2b40",
                }}
              />

            </div>

            <hr />

            {[1,2,3,4,5].map((item)=>(

              <div
                key={item}
                style={{
                  marginBottom:"15px",
                }}
              >

                <div
                  style={{
                    width:"90px",
                    height:"12px",
                    background:"#2b2b40",
                    borderRadius:"8px",
                    marginBottom:"8px",
                  }}
                />

                <div
                  style={{
                    width:"100%",
                    height:"15px",
                    background:"#2b2b40",
                    borderRadius:"8px",
                  }}
                />

              </div>

            ))}

            <hr />

            <div
              style={{
                width:"100%",
                height:"12px",
                background:"#2b2b40",
                borderRadius:"20px",
                marginBottom:"15px",
              }}
            />

            <div
              style={{
                width:"55%",
                height:"28px",
                background:"#2b2b40",
                borderRadius:"8px",
                marginBottom:"20px",
              }}
            />

            <div
              style={{
                display:"flex",
                gap:"10px",
              }}
            >

              <div
                style={{
                  flex:1,
                  height:"40px",
                  borderRadius:"8px",
                  background:"#2b2b40",
                }}
              />

              <div
                style={{
                  flex:1,
                  height:"40px",
                  borderRadius:"8px",
                  background:"#2b2b40",
                }}
              />

            </div>

          </div>

        ))}

      </div>

    </section>
  );
}