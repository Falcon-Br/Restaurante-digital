using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RestauranteDigital.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddComandas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ComandaId",
                table: "Pedidos",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Comandas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MesaId = table.Column<int>(type: "integer", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CriadaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalFinal = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comandas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Comandas_Mesas_MesaId",
                        column: x => x.MesaId,
                        principalTable: "Mesas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_ComandaId",
                table: "Pedidos",
                column: "ComandaId");

            migrationBuilder.CreateIndex(
                name: "IX_Comandas_MesaId",
                table: "Comandas",
                column: "MesaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pedidos_Comandas_ComandaId",
                table: "Pedidos",
                column: "ComandaId",
                principalTable: "Comandas",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pedidos_Comandas_ComandaId",
                table: "Pedidos");

            migrationBuilder.DropTable(
                name: "Comandas");

            migrationBuilder.DropIndex(
                name: "IX_Pedidos_ComandaId",
                table: "Pedidos");

            migrationBuilder.DropColumn(
                name: "ComandaId",
                table: "Pedidos");
        }
    }
}
