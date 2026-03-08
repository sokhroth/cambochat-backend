module.exports = (sequelize, DataTypes) => {
    const Participant = sequelize.define("Participant", {
        participant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        is_admin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        update_counter: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
       
        is_creator: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    })

    Participant.associate = function (models) {
        Participant.belongsTo(models.Chat, {
            foreignKey: "chat_id",
            onDelete: 'CASCADE'
        })
        Participant.belongsTo(models.User, {
            foreignKey: "user_id",
            allowNull: true,
            defaultValue: 0,
            onDelete: 'CASCADE'
        })
    }
    return Participant

}
