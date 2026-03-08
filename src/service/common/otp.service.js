const nodemailer = require("nodemailer")
const { User } = require("../../../models");
const { updateUser } = require("../../service/repository/user.service");
const axios = require("axios");
const process = require('process');

// To Genrate OTP
function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
}
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;


// To send OTP
async function sendEmailOTP(email, otp) {
    // Create a transporter object using SMTP transport
    if (process.env.NODE_ENV == "development") {
        return true
    }
    let transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: 'om.primocys@gmail.com', // Your Gmail email address
            pass: 'ndiq hcbn tist rfpx'
        }
    });

    // Define email options
    let mailOptions = {
        from: 'om.primocys@gmail.com', // Sender address
        to: email, // Recipient address
        subject: 'Your OTP for Verification on Reel Boost', // Subject line
        text: `Your OTP is: ${otp}` // Plain text body
    };

    try {
        // Send email
        let info = await transporter.sendMail(mailOptions);
        if (info) {
            const otpAsInteger = parseInt(otp, 10)

            try {
                // Update the profile with new data
                const otpInDB = await User.update({ otp: otpAsInteger }, { where: { email } });

                if (otpInDB) {
                    return true //Email sent Successfully
                }
                else {
                    return false //Email not sent Successfully
                }

            } catch (error) {
                console.error('Error sending OTP:', error);
                throw error;
            }
        }
        else {
            return false //Email not sent Successfully
        }
    } catch (err) {
        console.error("Error sending email:", err);
        return false; // Error occurred while sending email
    }
}

async function sendTwilioOTP(country_code, mobile_num, otp) {
    // Create a transporter object using SMTP transport
    const twilioClient = require("twilio")(accountSid, authToken);
    
    try {
        // Send email
        if (process.env.NODE_ENV == "development") {
            return true
        }
        const response = await twilioClient.messages.create({
            body: `Otp from Reel Boost is ${otp}.`,
            to: `${country_code}${mobile_num}`,
            from: process.env.TWILIO_PHONE_NUMBER,
        })

        if (response.status === "queued" || response.status === "sent" || response.status === "delivered") {
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error("Error sending otp in twilio:", err);
        return false; // Error occurred while sending email
    }
}
async function sendMesg91TP(country_code, mobile_num, otp) {
    // Create a transporter object using SMTP transport
    try {
        // Send email
        if (process.env.NODE_ENV == "development") {
            return true
        }

        
        const response = await axios.get("https://api.msg91.com/api/v5/otp", {
            params: {
                authkey: process.env.MSG91_API_KEY,
                template_id: process.env.MSG91_TEMPLATE_ID, // Template ID from your MSG91 account
                mobile: `91${mobile_num}`,
                // variables: { OTP: generatedOtp },
                otp: otp,
                sender: process.env.MSG91_SENDER_ID,
            },
        });
        
        if (response.data.type === "success") {
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error("Error sending otp in Message91:", err);
        return false; // Error occurred while sending email
    }
}

// Verify Otp

async function verifyOtp(userpayload) {
    try {
        const verificationStatus = await User.findOne({
            where: userpayload
        })

        if (verificationStatus) {
            const user = await updateUser(
                { login_verification_status: true, otp: 0 },
                { user_id: verificationStatus.user_id }
            )
        }
        return verificationStatus
    }
    catch (err) {
        console.error(err)
    }

}

module.exports = { sendEmailOTP, generateOTP, verifyOtp, sendTwilioOTP, sendMesg91TP }