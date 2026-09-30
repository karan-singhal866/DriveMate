import React, { useEffect, useState } from "react";
import api from "../services/api";
import BackButton from "../components/BackButton";
import socket from "../services/socket";

export default function MyBookings() {
    const [bookings, setBookings] = useState([]);
    const [otps, setOtps] = useState({});

    const load = async () => {
        try {
            const { data } = await api.get("/bookings/my");
            setBookings(data.bookings || []);
        } catch (err) {
            console.error("Failed to load bookings:", err);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        function updateBooking(
            bookingId,
            bookingData = {},
            extraData = {}
        ) {
            if (!bookingId) return;

            setBookings((prevBookings) =>
                prevBookings.map((booking) => {
                    if (
                        String(booking._id) !==
                        String(bookingId)
                    ) {
                        return booking;
                    }

                    return {
                        ...booking,
                        ...bookingData,
                        ...extraData
                    };
                })
            );

            const newStatus =
                bookingData.status ??
                extraData.status;

            /*
             * When the trip changes from accepted to ongoing,
             * the previously displayed handover OTP must be
             * removed from local state.
             *
             * Otherwise the old handover OTP remains in otps[]
             * and hides the Generate Return OTP button.
             */
            if (newStatus === "ongoing") {
                setOtps((prev) => {
                    const updated = { ...prev };
                    delete updated[bookingId];
                    return updated;
                });
            }

            /*
             * Clear OTP state when the booking reaches a final
             * state.
             */
            if (
                newStatus === "completed" ||
                newStatus === "cancelled" ||
                newStatus === "rejected"
            ) {
                setOtps((prev) => {
                    const updated = { ...prev };
                    delete updated[bookingId];
                    return updated;
                });
            }
        }

        function handleBookingUpdated(data) {
            console.log(
                "CUSTOMER REAL-TIME BOOKING UPDATE:",
                data
            );

            if (!data?.bookingId) return;

            updateBooking(
                data.bookingId,
                data.booking || {},
                {
                    ...(data.status !== undefined && {
                        status: data.status
                    }),

                    ...(data.startedAt !== undefined && {
                        startedAt: data.startedAt
                    }),

                    ...(data.completedAt !== undefined && {
                        completedAt: data.completedAt
                    }),

                    ...(data.handoverOtpVerified !==
                        undefined && {
                        handoverOtpVerified:
                            data.handoverOtpVerified
                    }),

                    ...(data.returnOtpVerified !==
                        undefined && {
                        returnOtpVerified:
                            data.returnOtpVerified
                    })
                }
            );
        }

        function handleTripStatus(data) {
            console.log(
                "CUSTOMER REAL-TIME TRIP STATUS:",
                data
            );

            if (!data?.bookingId) return;

            updateBooking(
                data.bookingId,
                data.booking || {},
                {
                    ...(data.status !== undefined && {
                        status: data.status
                    }),

                    ...(data.startedAt !== undefined && {
                        startedAt: data.startedAt
                    }),

                    ...(data.completedAt !== undefined && {
                        completedAt: data.completedAt
                    })
                }
            );
        }

        function handleHandoverOtp(data) {
            console.log(
                "REAL-TIME HANDOVER OTP:",
                data
            );

            if (!data?.bookingId) return;

            if (data.otp) {
                setOtps((prev) => ({
                    ...prev,
                    [data.bookingId]: data.otp
                }));
            }
        }

        function handleReturnOtp(data) {
            console.log(
                "REAL-TIME RETURN OTP:",
                data
            );

            if (!data?.bookingId) return;

            if (data.otp) {
                setOtps((prev) => ({
                    ...prev,
                    [data.bookingId]: data.otp
                }));
            }
        }

        socket.on(
            "bookingUpdated",
            handleBookingUpdated
        );

        socket.on(
            "tripStatus",
            handleTripStatus
        );

        socket.on(
            "handoverOtpGenerated",
            handleHandoverOtp
        );

        socket.on(
            "returnOtpGenerated",
            handleReturnOtp
        );

        return () => {
            socket.off(
                "bookingUpdated",
                handleBookingUpdated
            );

            socket.off(
                "tripStatus",
                handleTripStatus
            );

            socket.off(
                "handoverOtpGenerated",
                handleHandoverOtp
            );

            socket.off(
                "returnOtpGenerated",
                handleReturnOtp
            );
        };
    }, []);

    async function otp(id, type) {
        try {
            const endpoint =
                type === "handover"
                    ? "generate-otp"
                    : "generate-return-otp";

            const { data } = await api.post(
                `/bookings/${id}/${endpoint}`
            );

            if (data?.otp) {
                setOtps((prev) => ({
                    ...prev,
                    [id]: data.otp
                }));
            }
        } catch (err) {
            console.error(
                "OTP generation failed:",
                err
            );

            alert(
                err.response?.data?.message ||
                    "Unable to generate OTP."
            );
        }
    }

    function getStatusClass(status) {
        switch (status) {
            case "pending":
                return "status-pending";

            case "accepted":
                return "status-accepted";

            case "ongoing":
                return "status-ongoing";

            case "completed":
                return "status-completed";

            case "rejected":
                return "status-rejected";

            case "cancelled":
                return "status-cancelled";

            default:
                return "";
        }
    }

    return (
        <main className="container">
            <BackButton />

            <h1>My Bookings</h1>

            {bookings.length === 0 && (
                <div className="card">
                    <p>No bookings found.</p>
                </div>
            )}

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                    marginTop: "20px"
                }}
            >
                {bookings.map((b) => (
                    <div
                        className="card"
                        key={b._id}
                        style={{
                            padding: "22px",
                            borderRadius: "12px",
                            border: "1px solid #ddd",
                            boxShadow:
                                "0 3px 10px rgba(0,0,0,0.08)",
                            background: "#fff"
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "space-between",
                                alignItems: "center",
                                gap: "15px",
                                marginBottom: "18px",
                                flexWrap: "wrap"
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0
                                }}
                            >
                                {b.pickupLocation} →{" "}
                                {b.destination}
                            </h3>

                            <span
                                className={getStatusClass(
                                    b.status
                                )}
                                style={{
                                    padding:
                                        "6px 12px",
                                    borderRadius:
                                        "20px",
                                    fontWeight:
                                        "600",
                                    fontSize:
                                        "13px",
                                    textTransform:
                                        "capitalize",
                                    background:
                                        "#f1f1f1"
                                }}
                            >
                                {b.status}
                            </span>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: "10px",
                                marginBottom:
                                    "18px"
                            }}
                        >
                            <p
                                style={{
                                    margin: 0
                                }}
                            >
                                <strong>
                                    Driver:
                                </strong>{" "}
                                {b.driverId?.userId
                                    ?.name || "—"}
                            </p>

                            <p
                                style={{
                                    margin: 0
                                }}
                            >
                                <strong>
                                    Vehicle:
                                </strong>{" "}
                                {b.vehicleId
                                    ?.vehicleNumber ||
                                    "—"}
                            </p>

                            {b.createdAt && (
                                <p
                                    style={{
                                        margin: 0
                                    }}
                                >
                                    <strong>
                                        Booked:
                                    </strong>{" "}
                                    {new Date(
                                        b.createdAt
                                    ).toLocaleString()}
                                </p>
                            )}
                        </div>

                        {/* ACCEPTED */}
                        {b.status === "accepted" && (
                            <div
                                style={{
                                    marginTop:
                                        "15px",
                                    paddingTop:
                                        "15px",
                                    borderTop:
                                        "1px solid #eee"
                                }}
                            >
                                {!otps[b._id] && (
                                    <button
                                        onClick={() =>
                                            otp(
                                                b._id,
                                                "handover"
                                            )
                                        }
                                    >
                                        Generate
                                        Handover OTP
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ONGOING */}
                        {b.status === "ongoing" && (
                            <div
                                style={{
                                    marginTop:
                                        "15px",
                                    paddingTop:
                                        "15px",
                                    borderTop:
                                        "1px solid #eee"
                                }}
                            >
                                {!otps[b._id] && (
                                    <button
                                        onClick={() =>
                                            otp(
                                                b._id,
                                                "return"
                                            )
                                        }
                                    >
                                        Generate
                                        Return OTP
                                    </button>
                                )}
                            </div>
                        )}

                        {/* DISPLAY OTP */}
                        {otps[b._id] &&
                            b.status !==
                                "completed" &&
                            b.status !==
                                "cancelled" &&
                            b.status !==
                                "rejected" && (
                                <div
                                    className="otp"
                                    style={{
                                        marginTop:
                                            "15px",
                                        padding:
                                            "14px",
                                        borderRadius:
                                            "8px",
                                        background:
                                            "#f5f5f5",
                                        border:
                                            "1px dashed #aaa",
                                        textAlign:
                                            "center"
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize:
                                                "13px",
                                            marginBottom:
                                                "5px"
                                        }}
                                    >
                                        {b.status ===
                                        "accepted"
                                            ? "Handover OTP"
                                            : "Return OTP"}
                                    </div>

                                    <strong
                                        style={{
                                            fontSize:
                                                "24px",
                                            letterSpacing:
                                                "4px"
                                        }}
                                    >
                                        {otps[b._id]}
                                    </strong>
                                </div>
                            )}

                        {/* COMPLETED */}
                        {b.status === "completed" && (
                            <div
                                style={{
                                    marginTop:
                                        "15px",
                                    paddingTop:
                                        "15px",
                                    borderTop:
                                        "1px solid #eee"
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0
                                    }}
                                >
                                    <strong>
                                        Trip completed
                                        successfully.
                                    </strong>
                                </p>
                            </div>
                        )}

                        {/* REJECTED */}
                        {b.status === "rejected" && (
                            <div
                                style={{
                                    marginTop:
                                        "15px",
                                    paddingTop:
                                        "15px",
                                    borderTop:
                                        "1px solid #eee"
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0
                                    }}
                                >
                                    This booking was
                                    rejected by the
                                    driver.
                                </p>
                            </div>
                        )}

                        {/* CANCELLED */}
                        {b.status === "cancelled" && (
                            <div
                                style={{
                                    marginTop:
                                        "15px",
                                    paddingTop:
                                        "15px",
                                    borderTop:
                                        "1px solid #eee"
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0
                                    }}
                                >
                                    This booking has
                                    been cancelled.
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </main>
    );
}