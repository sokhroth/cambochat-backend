module.exports = (sequelize, DataTypes) => {
    const Poll = sequelize.define("Poll", {
        poll_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        poll_options: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
        },
        allow_multiple_votes: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    });

    Poll.associate = function (models) {
        Poll.belongsTo(models.User, {
            foreignKey: "created_by",
            onDelete: 'CASCADE'
        });

        Poll.belongsTo(models.Message, {
            foreignKey: "message_id",
            onDelete: 'CASCADE'
        });

        Poll.belongsTo(models.Chat, {
            foreignKey: "chat_id",
            onDelete: 'CASCADE'
        });
    };

    return Poll;
}
