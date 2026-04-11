using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestauranteDigital.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoriaCozinhar : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Cozinhar",
                table: "Categorias",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Cozinhar",
                table: "Categorias");
        }
    }
}
