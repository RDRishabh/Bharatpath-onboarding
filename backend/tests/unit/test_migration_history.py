"""The migration graph must retain every revision used by a shared database."""

from pathlib import Path

from alembic.script import ScriptDirectory

ROOT = Path(__file__).resolve().parents[2]


def _scripts() -> ScriptDirectory:
    return ScriptDirectory(str(ROOT / "alembic"))


def test_migration_graph_has_one_head() -> None:
    assert len(_scripts().get_heads()) == 1


def test_deployed_search_filter_revision_remains_resolvable() -> None:
    revision = _scripts().get_revision("0002_search_filter_options")
    assert revision is not None
    assert revision.down_revision == "0001_baseline"
