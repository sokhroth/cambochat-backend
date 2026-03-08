module.exports = (sequelize, DataTypes) => {
    const Config = sequelize.define("Config", {
        config_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        phone_authentication: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        email_authentication: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        maximum_members_in_group: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        user_name_flow: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        contact_flow: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        app_logo_light: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const raw_urls = this.getDataValue("app_logo_light");
                const imageUrls = `${process.env.baseUrl}/${raw_urls}`;
                return imageUrls != process.env.baseUrl ? imageUrls : ``;
            },
        },
        app_logo_dark: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const raw_urls = this.getDataValue("app_logo_dark");
                const imageUrls = `${process.env.baseUrl}/${raw_urls}`;
                return imageUrls != process.env.baseUrl ? imageUrls : ``;
            },
        },
        one_signal_app_id: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        one_signal_api_key: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const data = this.getDataValue("one_signal_api_key");
                if (!data) return "";
                return data.length > 4
                    ? "*".repeat(data.length - 4) + data.slice(-4)
                    : data;
            }
        },
        android_channel_id: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        app_name: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        app_email: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        app_text: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        app_primary_color: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        app_secondary_color: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        app_ios_link: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        app_android_link: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        app_tell_a_friend_text: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        web_logo_light: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const raw_urls = this.getDataValue("web_logo_light");
                const imageUrls = `${process.env.baseUrl}/${raw_urls}`;
                return imageUrls != process.env.baseUrl ? imageUrls : ``;
            },
        },
        web_logo_dark: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const raw_urls = this.getDataValue("web_logo_dark");
                const imageUrls = `${process.env.baseUrl}/${raw_urls}`;
                return imageUrls != process.env.baseUrl ? imageUrls : ``;
            },
        },
        twilio_account_sid: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const data = this.getDataValue("twilio_account_sid");
                if (!data) return "";
                return data.length > 4
                    ? "*".repeat(data.length - 4) + data.slice(-4)
                    : data;
            }
        },
        twilio_auth_token: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const data = this.getDataValue("twilio_auth_token");
                if (!data) return "";
                return data.length > 4
                    ? "*".repeat(data.length - 4) + data.slice(-4)
                    : data;
            }
        },
        twilio_phone_number: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const data = this.getDataValue("twilio_phone_number");
                if (!data) return "";
                return data.length > 4
                    ? "*".repeat(data.length - 4) + data.slice(-4)
                    : data;
            }
        },
        is_twilio_enabled: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: false,
        },
         is_msg91_enabled: {
             type: DataTypes.STRING,
            allowNull: false,
            defaultValue: false,
        },
        msg91_sender_id: {
        type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const data = this.getDataValue("msg91_sender_id");
                if (!data) return "";
                return data.length > 4
                    ? "*".repeat(data.length - 4) + data.slice(-4)
                    : data;
            }
        },
        msg91_api_key: {
        type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const data = this.getDataValue("msg91_api_key");
                if (!data) return "";
                return data.length > 4
                    ? "*".repeat(data.length - 4) + data.slice(-4)
                    : data;
            }
        },
        msg91_template_id: {
        type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const data = this.getDataValue("msg91_template_id");
                if (!data) return "";
                return data.length > 4
                    ? "*".repeat(data.length - 4) + data.slice(-4)
                    : data;
            }
        },

        email_service: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        smtp_host: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const data = this.getDataValue("sender_password");
                if (!data) return "";
                return "*".repeat(data.length)
            }
        },
        email_title: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        copyright_text: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        email_banner: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const raw_urls = this.getDataValue("email_banner");
                const imageUrls = `${process.env.baseUrl}${raw_urls}`;
                return imageUrls != process.env.baseUrl ? imageUrls : ``;
            },
        },
        privacy_policy: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: "",
        },
        terms_and_conditions: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: "",
        },

    })
    return Config;
}