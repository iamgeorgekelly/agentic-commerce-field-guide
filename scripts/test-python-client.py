"""Independent MCP client smoke test. Requires the official Python mcp package."""
import asyncio
import json
import pathlib
import sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

root = pathlib.Path(__file__).resolve().parents[1]
server = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / "server/index.mjs"

async def main():
    async with stdio_client(StdioServerParameters(command="node", args=[str(server)])) as (read, write):
        async with ClientSession(read, write) as client:
            await client.initialize()
            tools = await client.list_tools()
            assert len(tools.tools) == 3
            checks = [("compare_dimensions", "dimensions", "match"), ("compare_feed_snapshots", "feed-snapshots", "update_needed"), ("review_product_record", "product-record", "clear")]
            for name, example, expected in checks:
                args = json.loads((root / "examples" / (example + ".json")).read_text())
                result = await client.call_tool(name, args)
                assert not result.is_error, result
                value = result.structured_content
                assert value["result"]["status"] == expected, value
                print(name + ": " + expected)
            held = await client.call_tool("compare_dimensions", {"input": {}})
            assert held.structured_content["result"]["status"] == "hold"
            print("Incomplete input: hold; three tools discovered and called successfully")

asyncio.run(main())
