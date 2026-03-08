module.exports = (sequelize, DataTypes) => {
    const Story = sequelize.define("Story", {
        story_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        caption: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "",
        },
        media: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
            get() {
                const raw_urls = this.getDataValue("media");
                const imageUrls = `${process.env.baseUrl}/${raw_urls}`;
                return imageUrls != `${process.env.baseUrl}/`
                    ? imageUrls
                    : `${process.env.baseUrl}/uploads/not-found-images/profile-image.png`;
            },
        },
        thumbnail: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
            get() {
                const raw_urls = this.getDataValue("thumbnail");
                const imageUrls = `${process.env.baseUrl}/${raw_urls}`;
                return imageUrls != `${process.env.baseUrl}/`
                    ? imageUrls
                    : `${process.env.baseUrl}/uploads/not-found-images/profile-image.png`;
            },
        },
        story_type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        tagged: {
            type: DataTypes.ARRAY(DataTypes.DECIMAL),
            allowNull: true,
            defaultValue: [],
        },
        views: {
            type: DataTypes.ARRAY(DataTypes.DECIMAL),
            allowNull: false,
            defaultValue: [],
        },
        is_expired:{
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        }

    })

    Story.associate = function (models) {
        Story.belongsTo(models.User, {
            foreignKey: "user_id",
            allowNull: false,
            defaultValue: 0,
            onDelete: 'CASCADE',
            as: "user"
        })
        Story.hasMany(models.Message, {
            foreignKey: "story_id",
            allowNull: true,
            defaultValue: 0,
            onDelete: "CASCADE",
        })
    }

    return Story;
}