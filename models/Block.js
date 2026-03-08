module.exports = (sequelize, DataTypes) => {
    const Block = sequelize.define("Block", {
        block_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        approved: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },

    })

    Block.associate = function (models) {
        Block.belongsTo(models.User, {
            foreignKey: "user_id",
            as: "blocker",
            onDelete: 'CASCADE'
        })
        Block.belongsTo(models.User, {
          foreignKey: "blocked_id",
          as: "blocked",
          onDelete: "CASCADE",
        }),
          Block.belongsTo(models.Chat, {
            foreignKey: "blocked_chat_id",
            as: "blocked_chat",
            onDelete: "CASCADE",
          });

    }
    return Block
}