case `uname` in
  *Darwin*) OS="macos";;
  *) OS="linux";;
esac

case `uname -m` in
  *64*) BIN="cli-$OS-x64";;
  *) BIN="cli-$OS-x86";;
esac

if [ $BIN == "cli-macos-x86" ]; then
  echo "32-bit MacOS is not supported."
  exit 0
fi

CURRENT_DIR="$(cd "$(dirname "$BASH_SOURCE")"; pwd -P)"

"${CURRENT_DIR}/${BIN}" start-agent
