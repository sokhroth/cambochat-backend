module.exports = (sequelize, DataTypes) => {

    const Admin = sequelize.define("Admin", {
        admin_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        full_name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        user_name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        first_name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        mobile_num: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true, // This will ensure only one unique index is created
            get() {
                const data = this.getDataValue("mobile_num");
                if (!data) {
                    return "";
                }
                return data;
            },
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        socket_ids: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: [],
        },
        profile_pic: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
            get() {
                const raw_urls = this.getDataValue("profile_pic");
                const imageUrls = `${process.env.baseUrl}/${raw_urls}`;
                return imageUrls != `${process.env.baseUrl}/`
                    ? imageUrls
                    : `${process.env.baseUrl}/uploads/not-found-images/profile-image.png`;
            },
        },

        country: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        country_short_name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        state: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        city: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        country_code: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        profile_verification_status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        login_verification_status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        is_super_admin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    });
    return Admin;
}