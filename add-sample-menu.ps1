# PowerShell script to add sample menu items to your backend

$menuItems = @(
    @{ name = "Crispy Calamari Rings"; price = 12.99; category = "appetizers"; available = $true; description = "Fresh squid rings with marinara sauce and lemon wedges" },
    @{ name = "Buffalo Chicken Wings"; price = 14.99; category = "appetizers"; available = $true; description = "Spicy buffalo wings served with celery sticks and blue cheese dip" },
    @{ name = "Vegetarian Spring Rolls"; price = 9.99; category = "appetizers"; available = $true; description = "Crispy rolls filled with fresh vegetables and herbs" },
    @{ name = "Loaded Nachos Supreme"; price = 11.99; category = "appetizers"; available = $true; description = "Tortilla chips topped with cheese, jalapeños, sour cream, and guacamole" },
    @{ name = "Grilled Salmon Fillet"; price = 24.99; category = "mains"; available = $true; description = "Atlantic salmon with lemon herb butter and seasonal vegetables" },
    @{ name = "BBQ Beef Ribs"; price = 28.99; category = "mains"; available = $true; description = "Slow-cooked ribs with house BBQ sauce and coleslaw" },
    @{ name = "Vegetarian Pasta Primavera"; price = 18.99; category = "mains"; available = $true; description = "Fresh pasta with seasonal vegetables in creamy alfredo sauce" },
    @{ name = "Chocolate Lava Cake"; price = 8.99; category = "desserts"; available = $true; description = "Warm chocolate cake with molten center and vanilla ice cream" },
    @{ name = "New York Cheesecake"; price = 7.99; category = "desserts"; available = $true; description = "Classic cheesecake with berry compote and whipped cream" },
    @{ name = "Fresh Orange Juice"; price = 4.99; category = "beverages"; available = $true; description = "Freshly squeezed orange juice" },
    @{ name = "Craft Beer Selection"; price = 6.99; category = "beverages"; available = $true; description = "Local craft beer on tap" },
    @{ name = "Chef's Special Risotto"; price = 22.99; category = "specials"; available = $true; description = "Mushroom risotto with truffle oil and parmesan cheese" }
)

foreach ($item in $menuItems) {
    $json = $item | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5000/api/menu-items" -Method Post -ContentType "application/json" -Body $json
}
Write-Host "Sample menu items added!"
