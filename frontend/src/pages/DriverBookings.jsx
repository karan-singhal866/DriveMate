import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";

export default function DriverBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Driver manually enters these OTPs
    const [handoverOtpInputs, setHandoverOtpInputs] = useState({});
    const [returnOtpInputs, setReturnOtpInputs] = useState({});

    const loadBookings = async () => {
        try {
            const { data } = await api.get("/bookings/driver");
            setBookings(data.bookings || []);
        } catch (error) {
            console.error(
                "Error loading driver bookings:",
                error.response?.data || error.message
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();

        // -----------------------------------------
        // NEW BOOKING CREATED
        // -----------------------------------------
        const handleBookingCreated = (data) => {
            console.log(
                "DRIVER - NEW BOOKING CREATED:",
                data
            );

            if (!data?.booking) return;

            const newBooking = data.booking;

            setBookings((prev) => {
                const exists = prev.some(
                    (booking) =>
                        booking._id === newBooking._id
                );

                if (exists) {
                    return prev.map((booking) =>
                        booking._id === newBooking._id
                            ? {
                                  ...booking,
                                  ...newBooking
                              }
                            : booking
                    );
                }

                return [newBooking, ...prev];
            });
        };

        // -----------------------------------------
        // BOOKING UPDATED
        // -----------------------------------------
        const handleBookingUpdated = (data) => {
            console.log(
                "DRIVER - BOOKING UPDATED:",
                data
            );

            if (!data?.bookingId) return;

            setBookings((prev) => {
                const exists = prev.some(
                    (booking) =>
                        booking._id === data.bookingId
                );

                if (exists) {
                    return prev.map((booking) => {
                        if (
                            booking._id !==
                            data.bookingId
                        ) {
                            return booking;
                        }

                        return {
                            ...booking,
                            ...(data.booking || {}),
                            ...(data.status
                                ? {
                                      status:
                                          data.status
                                  }
                                : {})
                        };
                    });
                }

                if (data.booking) {
                    return [
                        data.booking,
                        ...prev
                    ];
                }

                return prev;
            });

            if (
                data.status === "completed" ||
                data.status === "cancelled" ||
                data.status === "rejected"
            ) {
                setHandoverOtpInputs((prev) => {
                    const copy = { ...prev };
                    delete copy[data.bookingId];
                    return copy;
                });

                setReturnOtpInputs((prev) => {
                    const copy = { ...prev };
                    delete copy[data.bookingId];
                    return copy;
                });
            }
        };

        // -----------------------------------------
        // TRIP STATUS
        // -----------------------------------------
        const handleTripStatus = (data) => {
            console.log(
                "DRIVER - TRIP STATUS:",
                data
            );

            if (!data?.bookingId) return;

            setBookings((prev) =>
                prev.map((booking) =>
                    booking._id === data.bookingId
                        ? {
                              ...booking,
                              ...(data.status
                                  ? {
                                        status:
                                            data.status
                                    }
                                  : {})
                          }
                        : booking
                )
            );
        };

        /*
         * IMPORTANT:
         *
         * We intentionally DO NOT listen for
         * handoverOtpGenerated or returnOtpGenerated
         * here.
         *
         * The driver must manually enter the OTP
         * given by the customer.
         */

        socket.on(
            "bookingCreated",
            handleBookingCreated
        );

        socket.on(
            "bookingUpdated",
            handleBookingUpdated
        );

        socket.on(
            "tripStatus",
            handleTripStatus
        );

        return () => {
            socket.off(
                "bookingCreated",
                handleBookingCreated
            );

            socket.off(
                "bookingUpdated",
                handleBookingUpdated
            );

            socket.off(
                "tripStatus",
                handleTripStatus
            );
        };
    }, []);

    // -----------------------------------------
    // UPDATE BOOKING FROM API RESPONSE
    // -----------------------------------------
    const updateBookingFromResponse = (booking) => {
        if (!booking?._id) return;

        setBookings((prev) => {
            const exists = prev.some(
                (item) => item._id === booking._id
            );

            if (exists) {
                return prev.map((item) =>
                    item._id === booking._id
                        ? {
                              ...item,
                              ...booking
                          }
                        : item
                );
            }

            return [booking, ...prev];
        });
    };

    // -----------------------------------------
    // ACCEPT BOOKING
    // -----------------------------------------
    const acceptBooking = async (bookingId) => {
        try {
            const { data } = await api.patch(
                `/bookings/${bookingId}/accept`
            );

            if (data.booking) {
                updateBookingFromResponse(
                    data.booking
                );
            } else {
                await loadBookings();
            }
        } catch (error) {
            console.error(
                "Accept booking error:",
                error.response?.data ||
                    error.message
            );

            alert(
                error.response?.data?.message ||
                    "Failed to accept booking."
            );
        }
    };

    // -----------------------------------------
    // REJECT BOOKING
    // -----------------------------------------
    const rejectBooking = async (bookingId) => {
        try {
            const { data } = await api.patch(
                `/bookings/${bookingId}/reject`
            );

            if (data.booking) {
                updateBookingFromResponse(
                    data.booking
                );
            } else {
                await loadBookings();
            }
        } catch (error) {
            console.error(
                "Reject booking error:",
                error.response?.data ||
                    error.message
            );

            alert(
                error.response?.data?.message ||
                    "Failed to reject booking."
            );
        }
    };

    // -----------------------------------------
    // VERIFY HANDOVER OTP
    // -----------------------------------------
    const verifyHandoverOtp = async (bookingId) => {
        const otp =
            handoverOtpInputs[bookingId]?.trim();

        if (!otp) {
            alert(
                "Please enter the handover OTP."
            );
            return;
        }

        try {
            const { data } = await api.post(
                `/bookings/${bookingId}/verify-otp`,
                { otp }
            );

            setBookings((prev) =>
                prev.map((booking) =>
                    booking._id === bookingId
                        ? {
                              ...booking,
                              handoverOtpVerified:
                                  true
                          }
                        : booking
                )
            );

            setHandoverOtpInputs((prev) => {
                const copy = { ...prev };
                delete copy[bookingId];
                return copy;
            });

            alert(
                data?.message ||
                    "Handover OTP verified. You can now start the trip."
            );
        } catch (error) {
            console.error(
                "Handover OTP verification error:",
                error.response?.data ||
                    error.message
            );

            alert(
                error.response?.data?.message ||
                    "Failed to verify handover OTP."
            );
        }
    };

    // -----------------------------------------
    // START TRIP
    // -----------------------------------------
    const startTrip = async (bookingId) => {
        try {
            const { data } = await api.patch(
                `/bookings/${bookingId}/start`
            );

            if (data.booking) {
                updateBookingFromResponse(
                    data.booking
                );
            } else {
                setBookings((prev) =>
                    prev.map((booking) =>
                        booking._id === bookingId
                            ? {
                                  ...booking,
                                  status:
                                      "ongoing",
                                  startedAt:
                                      new Date()
                              }
                            : booking
                    )
                );
            }

            alert(
                "Trip started successfully."
            );
        } catch (error) {
            console.error(
                "Start trip error:",
                error.response?.data ||
                    error.message
            );

            alert(
                error.response?.data?.message ||
                    "Failed to start trip."
            );
        }
    };

    // -----------------------------------------
    // VERIFY RETURN OTP
    // -----------------------------------------
    const verifyReturnOtp = async (bookingId) => {
        const otp =
            returnOtpInputs[bookingId]?.trim();

        if (!otp) {
            alert(
                "Please enter the return OTP."
            );
            return;
        }

        try {
            const { data } = await api.post(
                `/bookings/${bookingId}/verify-return-otp`,
                { otp }
            );

            setBookings((prev) =>
                prev.map((booking) =>
                    booking._id === bookingId
                        ? {
                              ...booking,
                              returnOtpVerified:
                                  true
                          }
                        : booking
                )
            );

            setReturnOtpInputs((prev) => {
                const copy = { ...prev };
                delete copy[bookingId];
                return copy;
            });

            alert(
                data?.message ||
                    "Return OTP verified. You can now complete the trip."
            );
        } catch (error) {
            console.error(
                "Return OTP verification error:",
                error.response?.data ||
                    error.message
            );

            alert(
                error.response?.data?.message ||
                    "Failed to verify return OTP."
            );
        }
    };

    // -----------------------------------------
    // COMPLETE TRIP
    // -----------------------------------------
    const completeTrip = async (bookingId) => {
        try {
            const { data } = await api.patch(
                `/bookings/${bookingId}/complete`
            );

            if (data.booking) {
                updateBookingFromResponse(
                    data.booking
                );
            } else {
                setBookings((prev) =>
                    prev.map((booking) =>
                        booking._id === bookingId
                            ? {
                                  ...booking,
                                  status:
                                      "completed"
                              }
                            : booking
                    )
                );
            }

            setReturnOtpInputs((prev) => {
                const copy = { ...prev };
                delete copy[bookingId];
                return copy;
            });

            alert(
                "Trip completed successfully."
            );
        } catch (error) {
            console.error(
                "Complete trip error:",
                error.response?.data ||
                    error.message
            );

            alert(
                error.response?.data?.message ||
                    "Failed to complete trip."
            );
        }
    };

    if (loading) {
        return <p>Loading bookings...</p>;
    }

    return (
        <div
            style={{
                maxWidth: "1000px",
                margin: "0 auto",
                padding: "30px 20px"
            }}
        >
            <Link
                to="/driver"
                style={{
                    display: "inline-block",
                    marginBottom: "20px",
                    textDecoration: "none",
                    color: "#333",
                    fontWeight: "500"
                }}
            >
                ← Back
            </Link>

            <h2
                style={{
                    marginBottom: "25px"
                }}
            >
                My Bookings
            </h2>

            {bookings.length === 0 ? (
                <p>No bookings found.</p>
            ) : (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "20px"
                    }}
                >
                    {bookings.map((booking) => (
                        <div
                            key={booking._id}
                            style={{
                                background:
                                    "#ffffff",
                                border:
                                    "1px solid #ddd",
                                borderRadius:
                                    "12px",
                                padding: "22px",
                                boxShadow:
                                    "0 2px 8px rgba(0,0,0,0.08)"
                            }}
                        >
                            <h3
                                style={{
                                    marginTop: 0,
                                    marginBottom:
                                        "15px"
                                }}
                            >
                                Booking ID:{" "}
                                {booking._id}
                            </h3>

                            <p>
                                <strong>
                                    Status:
                                </strong>{" "}
                                {booking.status}
                            </p>

                            {booking.customerId && (
                                <>
                                    <p>
                                        <strong>
                                            Customer:
                                        </strong>{" "}
                                        {
                                            booking
                                                .customerId
                                                .name
                                        }
                                    </p>

                                    <p>
                                        <strong>
                                            Phone:
                                        </strong>{" "}
                                        {
                                            booking
                                                .customerId
                                                .phone
                                        }
                                    </p>
                                </>
                            )}

                            <p>
                                <strong>
                                    Pickup:
                                </strong>{" "}
                                {
                                    booking.pickupLocation
                                }
                            </p>

                            <p>
                                <strong>
                                    Destination:
                                </strong>{" "}
                                {
                                    booking.destination
                                }
                            </p>

                            {/* PENDING */}
                            {booking.status ===
                                "pending" && (
                                <div
                                    style={{
                                        display:
                                            "flex",
                                        gap: "10px",
                                        marginTop:
                                            "15px"
                                    }}
                                >
                                    <button
                                        onClick={() =>
                                            acceptBooking(
                                                booking._id
                                            )
                                        }
                                    >
                                        Accept
                                    </button>

                                    <button
                                        onClick={() =>
                                            rejectBooking(
                                                booking._id
                                            )
                                        }
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}

                            {/* ACCEPTED */}
                            {booking.status ===
                                "accepted" && (
                                <div
                                    style={{
                                        marginTop:
                                            "15px"
                                    }}
                                >
                                    {!booking.handoverOtpVerified ? (
                                        <>
                                            <p>
                                                <strong>
                                                    Handover OTP
                                                </strong>
                                            </p>

                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                placeholder="Enter OTP"
                                                value={
                                                    handoverOtpInputs[
                                                        booking
                                                            ._id
                                                    ] ||
                                                    ""
                                                }
                                                onChange={(
                                                    e
                                                ) => {
                                                    const value =
                                                        e
                                                            .target
                                                            .value
                                                            .replace(
                                                                /\D/g,
                                                                ""
                                                            );

                                                    setHandoverOtpInputs(
                                                        (
                                                            prev
                                                        ) => ({
                                                            ...prev,
                                                            [booking._id]:
                                                                value
                                                        })
                                                    );
                                                }}
                                                style={{
                                                    padding:
                                                        "10px",
                                                    width:
                                                        "180px",
                                                    marginRight:
                                                        "10px",
                                                    border:
                                                        "1px solid #ccc",
                                                    borderRadius:
                                                        "6px"
                                                }}
                                            />

                                            <button
                                                onClick={() =>
                                                    verifyHandoverOtp(
                                                        booking._id
                                                    )
                                                }
                                            >
                                                Verify
                                                Handover
                                                OTP
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p>
                                                ✅
                                                Handover
                                                OTP
                                                verified.
                                            </p>

                                            <button
                                                onClick={() =>
                                                    startTrip(
                                                        booking._id
                                                    )
                                                }
                                            >
                                                Start
                                                Trip
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ONGOING */}
                            {booking.status ===
                                "ongoing" && (
                                <div
                                    style={{
                                        marginTop:
                                            "15px"
                                    }}
                                >
                                    <p>
                                        🚗 Trip is
                                        currently
                                        ongoing.
                                    </p>

                                    {!booking.returnOtpVerified ? (
                                        <>
                                            <p>
                                                <strong>
                                                    Return OTP
                                                </strong>
                                            </p>

                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                placeholder="Enter OTP"
                                                value={
                                                    returnOtpInputs[
                                                        booking
                                                            ._id
                                                    ] ||
                                                    ""
                                                }
                                                onChange={(
                                                    e
                                                ) => {
                                                    const value =
                                                        e
                                                            .target
                                                            .value
                                                            .replace(
                                                                /\D/g,
                                                                ""
                                                            );

                                                    setReturnOtpInputs(
                                                        (
                                                            prev
                                                        ) => ({
                                                            ...prev,
                                                            [booking._id]:
                                                                value
                                                        })
                                                    );
                                                }}
                                                style={{
                                                    padding:
                                                        "10px",
                                                    width:
                                                        "180px",
                                                    marginRight:
                                                        "10px",
                                                    border:
                                                        "1px solid #ccc",
                                                    borderRadius:
                                                        "6px"
                                                }}
                                            />

                                            <button
                                                onClick={() =>
                                                    verifyReturnOtp(
                                                        booking._id
                                                    )
                                                }
                                            >
                                                Verify
                                                Return
                                                OTP
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p>
                                                ✅
                                                Return
                                                OTP
                                                verified.
                                            </p>

                                            <button
                                                onClick={() =>
                                                    completeTrip(
                                                        booking._id
                                                    )
                                                }
                                            >
                                                Complete
                                                Trip
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* COMPLETED */}
                            {booking.status ===
                                "completed" && (
                                <p>
                                    ✅ Trip completed.
                                </p>
                            )}

                            {/* REJECTED */}
                            {booking.status ===
                                "rejected" && (
                                <p>
                                    ❌ Booking rejected.
                                </p>
                            )}

                            {/* CANCELLED */}
                            {booking.status ===
                                "cancelled" && (
                                <p>
                                    ❌ Booking cancelled.
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}